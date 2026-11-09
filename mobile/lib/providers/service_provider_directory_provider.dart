import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../core/service_categories.dart';
import '../models/user_model.dart';
import '../services/firestore_service.dart';

class ServiceProviderDirectoryProvider with ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  StreamSubscription<List<UserProfile>>? _providersSubscription;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _categoriesSubscription;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _hodSubscription;
  StreamSubscription<User?>? _authSubscription;

  List<UserProfile> _rawVerifiedProviders = [];
  List<UserProfile> _allVerifiedProviders = [];
  Map<String, Map<String, String>> _hodOverridesByUid = {};
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedCategory = 'All';

  // Live active category names & configs synced from app_config/service_categories
  static List<String> get categories => ServiceCategories.withAll;
  List<ServiceCategoryConfig> get activeCategoryItems => ServiceCategories.activeItems;

  ServiceProviderDirectoryProvider() {
    _initCategoriesStream();
    _initHodDirectoryStream();
    _initStream();
    _authSubscription = FirebaseAuth.instance.authStateChanges().listen((user) {
      if (user != null) {
        _initStream();
      }
    });
  }

  void _initCategoriesStream() {
    _categoriesSubscription?.cancel();
    _categoriesSubscription = _firestore
        .collection('app_config')
        .doc('service_categories')
        .snapshots()
        .listen((docSnap) {
      if (docSnap.exists) {
        ServiceCategories.updateFromFirestore(docSnap.data());
        // If the currently selected category was deactivated, reset filter to 'All'
        if (_selectedCategory != 'All' && !ServiceCategories.list.contains(_selectedCategory)) {
          _selectedCategory = 'All';
        }
        notifyListeners();
      }
    }, onError: (e) {
      debugPrint('Error streaming service categories config: $e');
    });
  }

  void _initHodDirectoryStream() {
    _hodSubscription?.cancel();
    _hodSubscription = _firestore
        .collection('app_config')
        .doc('hod_directory')
        .snapshots()
        .listen((docSnap) {
      final nextOverrides = <String, Map<String, String>>{};
      if (docSnap.exists) {
        final data = docSnap.data();
        final rawAssignments = data?['assignments'];
        if (rawAssignments is List) {
          for (final item in rawAssignments) {
            if (item is Map && item['isActive'] != false) {
              final uid = (item['hodUid'] ?? '').toString().trim();
              final catName = (item['categoryName'] ?? '').toString().trim();
              final stateName = (item['stateName'] ?? '').toString().trim();
              if (uid.isNotEmpty && catName.isNotEmpty) {
                nextOverrides[uid] = {
                  'categoryName': catName,
                  if (stateName.isNotEmpty) 'stateName': stateName,
                };
              }
            }
          }
        }
      }
      _hodOverridesByUid = nextOverrides;
      _rebuildVerifiedProviders();
    }, onError: (e) {
      debugPrint('Error streaming hod_directory config: $e');
    });
  }

  void _initStream() {
    _isLoading = _allVerifiedProviders.isEmpty;
    _providersSubscription?.cancel();
    _providersSubscription = _firestoreService.streamVerifiedProviders().listen((providers) {
      _rawVerifiedProviders = providers.where((p) => p.isServiceProvider && p.isApproved).toList();
      _isLoading = false;
      _rebuildVerifiedProviders();
    }, onError: (e) {
      debugPrint('Error streaming verified providers: $e');
      _isLoading = false;
      notifyListeners();
    });
  }

  void _rebuildVerifiedProviders() {
    final mapped = _rawVerifiedProviders.map((p) {
      final override = _hodOverridesByUid[p.uid];
      final mergedRaw = Map<String, dynamic>.from(p.rawData);
      if (override != null) {
        mergedRaw['isHod'] = true;
        if (override['categoryName'] != null && override['categoryName']!.isNotEmpty) {
          mergedRaw['serviceCategory'] = override['categoryName'];
        }
        if (override['stateName'] != null && override['stateName']!.isNotEmpty) {
          mergedRaw['state'] = override['stateName'];
        }
      }
      return UserProfile.fromMap(mergedRaw, p.uid);
    }).toList();

    // Sort appointed State HODs to the top so clients see official Department Heads first
    mapped.sort((a, b) {
      final aIsHod = a.rawData['isHod'] == true ? 1 : 0;
      final bIsHod = b.rawData['isHod'] == true ? 1 : 0;
      return bIsHod.compareTo(aIsHod);
    });

    _allVerifiedProviders = mapped;

    ServiceCategories.syncFromRealProviderCategories(
      _allVerifiedProviders
          .map((p) => p.serviceCategory ?? '')
          .where((c) => c.trim().isNotEmpty),
    );
    notifyListeners();
  }

  @override
  void dispose() {
    _providersSubscription?.cancel();
    _categoriesSubscription?.cancel();
    _hodSubscription?.cancel();
    _authSubscription?.cancel();
    super.dispose();
  }

  bool get isLoading => _isLoading;
  String get searchQuery => _searchQuery;
  String get selectedCategory => _selectedCategory;
  int get totalVerifiedCount => _allVerifiedProviders.length;
  List<UserProfile> get allVerifiedProviders => _allVerifiedProviders;

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setSelectedCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void resetFilters() {
    _searchQuery = '';
    _selectedCategory = 'All';
    notifyListeners();
  }

  /// Returns ONLY verified service providers matching active search and category
  List<UserProfile> get verifiedProviders {
    return _allVerifiedProviders.where((p) {
      // 1. Strict verification check (double safeguard)
      if (!p.isServiceProvider || !p.isApproved) return false;

      // 2. Category Filter
      final providerCategory = (p.serviceCategory ?? '').toLowerCase();
      bool matchesCategory = true;
      if (_selectedCategory != 'All') {
        final catQuery = _selectedCategory.toLowerCase();
        matchesCategory = providerCategory.contains(catQuery) ||
            catQuery.contains(providerCategory) ||
            _matchSynonyms(_selectedCategory, providerCategory);
      }

      // 3. Search Query Filter
      bool matchesSearch = true;
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        final name = p.fullName.toLowerCase();
        final business = (p.businessName ?? '').toLowerCase();
        final categoryText = providerCategory;
        final area = (p.coverageArea ?? '').toLowerCase();
        final bio = (p.bio ?? '').toLowerCase();

        matchesSearch = name.contains(q) ||
            business.contains(q) ||
            categoryText.contains(q) ||
            area.contains(q) ||
            bio.contains(q) ||
            _matchSynonyms(q, providerCategory);
      }

      return matchesCategory && matchesSearch;
    }).toList();
  }

  bool _matchSynonyms(String term, String providerTrade) {
    final t = term.toLowerCase();
    final p = providerTrade.toLowerCase();

    if ((t.contains('plumb') || t.contains('pipe') || t.contains('leak')) &&
        (p.contains('plumb') || p.contains('pipe'))) {
      return true;
    }
    if ((t.contains('elect') || t.contains('wir') || t.contains('power') || t.contains('socket')) &&
        (p.contains('elect') || p.contains('wir'))) {
      return true;
    }
    if ((t.contains('carpent') || t.contains('wood') || t.contains('door') || t.contains('furnit')) &&
        (p.contains('carpent') || p.contains('wood'))) {
      return true;
    }
    if ((t.contains('paint') || t.contains('wall') || t.contains('coat')) &&
        (p.contains('paint') || p.contains('finish'))) {
      return true;
    }
    if ((t.contains('ac') || t.contains('air') || t.contains('hvac') || t.contains('cool')) &&
        (p.contains('ac') || p.contains('hvac') || p.contains('cool'))) {
      return true;
    }
    if ((t.contains('clean') || t.contains('fumig') || t.contains('pest')) &&
        (p.contains('clean') || p.contains('fumig'))) {
      return true;
    }
    if ((t.contains('solar') || t.contains('invert') || t.contains('battery')) &&
        (p.contains('solar') || p.contains('invert'))) {
      return true;
    }
    if ((t.contains('appliance') || t.contains('fridge') || t.contains('tv') || t.contains('machine')) &&
        (p.contains('appliance') || p.contains('repair'))) {
      return true;
    }
    if ((t.contains('mason') || t.contains('til') || t.contains('floor') || t.contains('brick')) &&
        (p.contains('mason') || p.contains('til') || p.contains('floor'))) {
      return true;
    }
    if ((t.contains('weld') || t.contains('metal') || t.contains('iron')) &&
        (p.contains('weld') || p.contains('metal') || p.contains('fabricat'))) {
      return true;
    }
    if ((t.contains('garden') || t.contains('landscap') || t.contains('lawn')) &&
        (p.contains('garden') || p.contains('landscap'))) {
      return true;
    }
    return false;
  }
}
