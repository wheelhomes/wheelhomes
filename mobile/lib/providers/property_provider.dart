import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../models/property_model.dart';
import '../services/firestore_service.dart';
import '../services/storage_service.dart';

class PropertyProvider with ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  final StorageService _storageService = StorageService();

  List<PropertyModel> _properties = [];
  String _selectedCategory = 'All';
  String _searchQuery = '';
  bool _isLoading = false;
  bool _isCreating = false;

  bool get isCreating => _isCreating;

  List<PropertyModel> get properties {
    return _properties.where((p) {
      final matchesCategory = _selectedCategory == 'All' ||
          p.type.toLowerCase() == _selectedCategory.toLowerCase() ||
          p.status.toLowerCase() == _selectedCategory.toLowerCase();
      final matchesSearch = p.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          p.address.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();
  }

  String get selectedCategory => _selectedCategory;
  bool get isLoading => _isLoading;

  PropertyProvider() {
    _initStream();
  }

  void _initStream() {
    _isLoading = true;
    _firestoreService.streamProperties().listen((data) {
      _properties = data;
      _isLoading = false;
      notifyListeners();
    }, onError: (e) {
      _isLoading = false;
      notifyListeners();
    });
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  Future<bool> createPropertyListing({
    required String title,
    required String price,
    required String address,
    required int beds,
    required int baths,
    required int sqft,
    required String type,
    required String status,
    required String agentName,
    String? agentImage,
    List<XFile> images = const [],
  }) async {
    _isCreating = true;
    notifyListeners();

    try {
      String mainImage = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80';
      List<String> imageUrls = [];

      if (images.isNotEmpty) {
        final batchId = 'prop_${DateTime.now().millisecondsSinceEpoch}';
        imageUrls = await _storageService.uploadPropertyImages(
          propertyId: batchId,
          images: images,
        );
        if (imageUrls.isNotEmpty) {
          mainImage = imageUrls.first;
        }
      }

      await _firestoreService.createProperty({
        'title': title,
        'price': price,
        'address': address,
        'beds': beds,
        'baths': baths,
        'sqft': sqft,
        'type': type,
        'status': status,
        'image': mainImage,
        'images': imageUrls,
        'agentName': agentName,
        'agentImage': agentImage,
        'createdAt': DateTime.now().toIso8601String(),
      });

      _isCreating = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error creating property listing: $e');
      _isCreating = false;
      notifyListeners();
      return false;
    }
  }
}
