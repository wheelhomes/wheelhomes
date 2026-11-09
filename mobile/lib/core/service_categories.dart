import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

class ServiceCategoryConfig {
  final String id;
  final String name;
  final String shortTitle;
  final String subtitle;
  final String description;
  final String iconKey;
  final String colorHex;
  final bool isActive;
  final int order;

  const ServiceCategoryConfig({
    required this.id,
    required this.name,
    required this.shortTitle,
    required this.subtitle,
    required this.description,
    required this.iconKey,
    required this.colorHex,
    this.isActive = true,
    this.order = 0,
  });

  factory ServiceCategoryConfig.fromMap(Map<String, dynamic> map, int index) {
    final rawName = (map['name'] ?? 'General Maintenance').toString().trim();
    final defaultShort = rawName.split(RegExp(r'[\s&/,]+')).first;
    return ServiceCategoryConfig(
      id: (map['id'] ?? rawName.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-')).toString(),
      name: rawName,
      shortTitle: (map['shortTitle'] ?? defaultShort).toString().trim(),
      subtitle: (map['subtitle'] ?? 'Verified Pro').toString().trim(),
      description: (map['description'] ?? 'Professional $rawName services.').toString().trim(),
      iconKey: (map['iconKey'] ?? 'wrench').toString().trim(),
      colorHex: (map['colorHex'] ?? '#10B981').toString().trim(),
      isActive: map['isActive'] != false,
      order: map['order'] is num ? (map['order'] as num).toInt() : index + 1,
    );
  }

  IconData get icon => ServiceCategories.iconFromKey(iconKey, fallbackCategoryName: name);
  Color get color => ServiceCategories.colorFromHex(colorHex, fallbackCategoryName: name);
}

class ServiceCategories {
  // 13 Official Default Categories (instant offline fallback before Firestore syncs)
  static const List<ServiceCategoryConfig> defaultItems = [
    ServiceCategoryConfig(
      id: 'electrical-wiring',
      name: 'Electrical & Wiring',
      shortTitle: 'Electrical',
      subtitle: 'Wiring & Power',
      description: 'Wiring, circuit boards, fault diagnostics, and emergency power repairs.',
      iconKey: 'zap',
      colorHex: '#D97706',
      order: 1,
    ),
    ServiceCategoryConfig(
      id: 'solar-inverter',
      name: 'Solar & Inverter Systems',
      shortTitle: 'Solar & Power',
      subtitle: 'Inverters & Panels',
      description: 'Solar panel arrays, hybrid inverters, lithium batteries, and backup power setup.',
      iconKey: 'sun',
      colorHex: '#EAB308',
      order: 2,
    ),
    ServiceCategoryConfig(
      id: 'appliance-repair',
      name: 'Appliance Repair',
      shortTitle: 'Appliances',
      subtitle: 'Fridge & Machines',
      description: 'Refrigerators, washing machines, microwaves, ovens, and home electronics repair.',
      iconKey: 'tv',
      colorHex: '#6366F1',
      order: 3,
    ),
    ServiceCategoryConfig(
      id: 'plumbing-pipefitting',
      name: 'Plumbing & Pipefitting',
      shortTitle: 'Plumbing',
      subtitle: 'Pipes & Leaks',
      description: 'Leak detection, water heaters, borehole pumps, drainage, and sanitary fittings.',
      iconKey: 'droplets',
      colorHex: '#047857',
      order: 4,
    ),
    ServiceCategoryConfig(
      id: 'hvac-ac',
      name: 'HVAC & AC Repair',
      shortTitle: 'AC / HVAC',
      subtitle: 'Cooling & Gas',
      description: 'Split & central AC servicing, gas refilling, compressor repair, and ventilation.',
      iconKey: 'fan',
      colorHex: '#0284C7',
      order: 5,
    ),
    ServiceCategoryConfig(
      id: 'carpentry-woodwork',
      name: 'Carpentry & Woodwork',
      shortTitle: 'Carpentry',
      subtitle: 'Doors & Wood',
      description: 'Custom cabinetry, wardrobes, door locks, wood framing, and furniture restoration.',
      iconKey: 'hammer',
      colorHex: '#B45309',
      order: 6,
    ),
    ServiceCategoryConfig(
      id: 'painting-wall',
      name: 'Painting & Wall Finishes',
      shortTitle: 'Painting',
      subtitle: 'Wall & Finish',
      description: 'Interior & exterior painting, screeding, wallpaper installation, and decorative finishes.',
      iconKey: 'paintbrush',
      colorHex: '#7C3AED',
      order: 7,
    ),
    ServiceCategoryConfig(
      id: 'cleaning-fumigation',
      name: 'Cleaning & Fumigation',
      shortTitle: 'Cleaning',
      subtitle: 'Deep Clean',
      description: 'Post-construction cleaning, move-in deep cleaning, pest control, and fumigation.',
      iconKey: 'sparkles',
      colorHex: '#0D9488',
      order: 8,
    ),
    ServiceCategoryConfig(
      id: 'roofing-ceiling',
      name: 'Roofing & Ceiling',
      shortTitle: 'Roofing',
      subtitle: 'Ceiling Repair',
      description: 'Roof leak sealing, aluminum/stone-coated roofing, POP ceilings, and gutters.',
      iconKey: 'home',
      colorHex: '#E11D48',
      order: 9,
    ),
    ServiceCategoryConfig(
      id: 'masonry-tiling',
      name: 'Masonry, Tiling & Flooring',
      shortTitle: 'Tiling & Floors',
      subtitle: 'Masonry & Tiles',
      description: 'Floor & wall tiling, interlocking stones, concrete plastering, and structural masonry.',
      iconKey: 'brick-wall',
      colorHex: '#78716C',
      order: 10,
    ),
    ServiceCategoryConfig(
      id: 'welding-metal',
      name: 'Welding & Metal Fabrication',
      shortTitle: 'Welding',
      subtitle: 'Gates & Iron',
      description: 'Security gates, burglary proofs, railings, carport canopies, and steel fabrication.',
      iconKey: 'flame',
      colorHex: '#EA580C',
      order: 11,
    ),
    ServiceCategoryConfig(
      id: 'landscaping-gardening',
      name: 'Landscaping & Gardening',
      shortTitle: 'Landscaping',
      subtitle: 'Lawn & Garden',
      description: 'Lawn maintenance, horticulture, tree trimming, and outdoor garden design.',
      iconKey: 'flower',
      colorHex: '#16A34A',
      order: 12,
    ),
    ServiceCategoryConfig(
      id: 'general-maintenance',
      name: 'General Maintenance',
      shortTitle: 'Maintenance',
      subtitle: 'Fixes & Handyman',
      description: 'All-round handyman repairs, fixture mounting, and routine property upkeep.',
      iconKey: 'wrench',
      colorHex: '#2563EB',
      order: 13,
    ),
  ];

  static List<ServiceCategoryConfig> _allItems = <ServiceCategoryConfig>[];
  static Set<String> _deletedIds = <String>{};
  static bool _hasSyncedFromFirestore = false;

  /// Updates the in-memory categories from Firestore `app_config/service_categories`
  static void updateFromFirestore(Map<String, dynamic>? data) {
    if (data == null || data['categories'] is! List) {
      return;
    }
    _hasSyncedFromFirestore = true;
    if (data['deletedIds'] is List) {
      _deletedIds = (data['deletedIds'] as List).map((e) => e.toString().toLowerCase()).toSet();
    }
    final rawList = data['categories'] as List;
    final parsed = <ServiceCategoryConfig>[];
    for (int i = 0; i < rawList.length; i++) {
      final item = rawList[i];
      if (item is Map) {
        parsed.add(ServiceCategoryConfig.fromMap(Map<String, dynamic>.from(item), i));
      }
    }
    parsed.sort((a, b) => a.order.compareTo(b.order));
    _allItems = parsed;
  }

  /// Dynamically populates categories from real verified providers ONLY before `app_config/service_categories` has synced
  static void syncFromRealProviderCategories(Iterable<String> rawCategories) {
    if (_hasSyncedFromFirestore) return;
    final next = List<ServiceCategoryConfig>.from(_allItems);
    bool changed = false;

    for (final raw in rawCategories) {
      final clean = raw.trim();
      if (clean.isEmpty) continue;
      final slug = clean.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-');
      if (_deletedIds.contains(slug) || _deletedIds.contains(clean.toLowerCase())) {
        continue;
      }
      final exists = next.any((c) =>
          c.id.toLowerCase() == slug ||
          c.name.toLowerCase() == clean.toLowerCase() ||
          c.shortTitle.toLowerCase() == clean.toLowerCase());
      if (!exists) {
        next.add(ServiceCategoryConfig.fromMap({
          'id': slug,
          'name': clean,
          'shortTitle': clean.split(RegExp(r'[\s&/,]+')).first,
          'subtitle': 'Verified Specialists',
          'description': 'Verified $clean professionals.',
          'iconKey': 'wrench',
          'colorHex': '#10B981',
          'isActive': true,
          'order': next.length + 1,
        }, next.length));
        changed = true;
      }
    }

    if (changed || (!_hasSyncedFromFirestore && _allItems.isEmpty && next.isNotEmpty)) {
      _allItems = next;
    }
  }

  /// Active category configs (for Home screen cards & directory)
  static List<ServiceCategoryConfig> get activeItems {
    return _allItems.where((c) => c.isActive).toList();
  }

  /// Active category names (for dropdowns, filter chips, and onboarding)
  static List<String> get list {
    final active = activeItems.map((c) => c.name).toList();
    return active.isNotEmpty ? active : defaultItems.map((c) => c.name).toList();
  }

  static List<String> get withAll => ['All', ...list];

  static IconData iconFromKey(String? key, {String? fallbackCategoryName}) {
    switch (key) {
      case 'zap':
        return LucideIcons.zap;
      case 'sun':
        return LucideIcons.sun;
      case 'tv':
        return LucideIcons.tv;
      case 'droplets':
        return LucideIcons.droplets;
      case 'fan':
        return LucideIcons.fan;
      case 'hammer':
        return LucideIcons.hammer;
      case 'paintbrush':
        return LucideIcons.paintBucket;
      case 'sparkles':
        return LucideIcons.sparkles;
      case 'home':
        return LucideIcons.home;
      case 'brick-wall':
        return LucideIcons.brickWall;
      case 'flame':
        return LucideIcons.flame;
      case 'flower':
        return LucideIcons.flower2;
      case 'shield':
        return LucideIcons.shieldCheck;
      case 'truck':
        return LucideIcons.truck;
      case 'wrench':
        return LucideIcons.wrench;
      default:
        return _keywordIcon(fallbackCategoryName);
    }
  }

  static Color colorFromHex(String? hexString, {String? fallbackCategoryName}) {
    if (hexString != null && hexString.startsWith('#') && hexString.length == 7) {
      final parsed = int.tryParse(hexString.substring(1), radix: 16);
      if (parsed != null) {
        return Color(0xFF000000 | parsed);
      }
    }
    return _keywordColor(fallbackCategoryName);
  }

  static IconData getIcon(String? category) {
    if (category != null && category.trim().isNotEmpty) {
      final q = category.trim().toLowerCase();
      for (final item in _allItems) {
        if (item.name.toLowerCase() == q || item.shortTitle.toLowerCase() == q) {
          return item.icon;
        }
      }
    }
    return _keywordIcon(category);
  }

  static Color getColor(String? category) {
    if (category != null && category.trim().isNotEmpty) {
      final q = category.trim().toLowerCase();
      for (final item in _allItems) {
        if (item.name.toLowerCase() == q || item.shortTitle.toLowerCase() == q) {
          return item.color;
        }
      }
    }
    return _keywordColor(category);
  }

  static IconData _keywordIcon(String? category) {
    final cat = (category ?? '').toLowerCase();
    if (cat.contains('elect') || cat.contains('wir')) return LucideIcons.zap;
    if (cat.contains('solar') || cat.contains('invert') || cat.contains('sun')) return LucideIcons.sun;
    if (cat.contains('appliance') || cat.contains('fridge') || cat.contains('machine')) return LucideIcons.tv;
    if (cat.contains('plumb') || cat.contains('pipe') || cat.contains('water')) return LucideIcons.droplets;
    if (cat.contains('hvac') || cat.contains('ac ') || cat.contains('air') || cat.contains('cool')) return LucideIcons.fan;
    if (cat.contains('carpent') || cat.contains('wood') || cat.contains('furnit')) return LucideIcons.hammer;
    if (cat.contains('paint') || cat.contains('wall') || cat.contains('coat')) return LucideIcons.paintBucket;
    if (cat.contains('clean') || cat.contains('fumig') || cat.contains('pest')) return LucideIcons.sparkles;
    if (cat.contains('roof') || cat.contains('ceiling')) return LucideIcons.home;
    if (cat.contains('mason') || cat.contains('til') || cat.contains('floor')) return LucideIcons.brickWall;
    if (cat.contains('weld') || cat.contains('metal')) return LucideIcons.flame;
    if (cat.contains('garden') || cat.contains('landscap')) return LucideIcons.flower2;
    return LucideIcons.wrench;
  }

  static Color _keywordColor(String? category) {
    final cat = (category ?? '').toLowerCase();
    if (cat.contains('elect') || cat.contains('wir')) return const Color(0xFFD97706);
    if (cat.contains('solar') || cat.contains('invert')) return const Color(0xFFEAB308);
    if (cat.contains('appliance')) return const Color(0xFF6366F1);
    if (cat.contains('plumb') || cat.contains('pipe')) return const Color(0xFF047857);
    if (cat.contains('hvac') || cat.contains('ac ') || cat.contains('air')) return const Color(0xFF0284C7);
    if (cat.contains('carpent') || cat.contains('wood')) return const Color(0xFFB45309);
    if (cat.contains('paint')) return const Color(0xFF7C3AED);
    if (cat.contains('clean') || cat.contains('fumig')) return const Color(0xFF0D9488);
    if (cat.contains('roof') || cat.contains('ceiling')) return const Color(0xFFE11D48);
    if (cat.contains('mason') || cat.contains('til')) return const Color(0xFF78716C);
    if (cat.contains('weld') || cat.contains('metal')) return const Color(0xFFEA580C);
    if (cat.contains('garden') || cat.contains('landscap')) return const Color(0xFF16A34A);
    return const Color(0xFF2563EB);
  }

  /// Normalizes incoming input to the closest matching active category
  static String normalize(String? category) {
    final currentList = list;
    if (category == null || category.trim().isEmpty) return currentList.first;
    final cat = category.trim().toLowerCase();

    // Direct match against active categories
    for (final item in activeItems) {
      if (item.name.toLowerCase() == cat || item.shortTitle.toLowerCase() == cat || item.id.toLowerCase() == cat) {
        return item.name;
      }
    }

    // Partial match against active categories
    for (final item in activeItems) {
      if (item.name.toLowerCase().contains(cat) || cat.contains(item.shortTitle.toLowerCase())) {
        return item.name;
      }
    }

    return category.trim();
  }
}
