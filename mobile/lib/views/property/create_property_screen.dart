import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/property_provider.dart';

class CreatePropertyScreen extends StatefulWidget {
  const CreatePropertyScreen({super.key});

  @override
  State<CreatePropertyScreen> createState() => _CreatePropertyScreenState();
}

class _CreatePropertyScreenState extends State<CreatePropertyScreen> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _picker = ImagePicker();
  final List<XFile> _selectedImages = [];

  final _titleController = TextEditingController();
  final _priceController = TextEditingController();
  final _addressController = TextEditingController();
  final _bedsController = TextEditingController(text: '3');
  final _bathsController = TextEditingController(text: '3');
  final _sqftController = TextEditingController(text: '1500');

  String _selectedType = 'Apartment';
  String _selectedStatus = 'For Rent';

  final List<String> _propertyTypes = [
    'Apartment',
    'Studio',
    'Duplex',
    'Villa',
    'Penthouse',
    'Commercial',
    'Land',
  ];

  final List<String> _propertyStatuses = [
    'For Rent',
    'For Sale',
    'Shortlet',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _priceController.dispose();
    _addressController.dispose();
    _bedsController.dispose();
    _bathsController.dispose();
    _sqftController.dispose();
    super.dispose();
  }

  Future<void> _pickImages(ImageSource source) async {
    try {
      if (source == ImageSource.gallery) {
        final List<XFile> picked = await _picker.pickMultiImage(
          imageQuality: 85,
          maxWidth: 1800,
        );
        if (picked.isNotEmpty) {
          setState(() {
            _selectedImages.addAll(picked);
            if (_selectedImages.length > 8) {
              _selectedImages.removeRange(8, _selectedImages.length);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Maximum 8 images allowed.')),
                );
              }
            }
          });
        }
      } else {
        final XFile? photo = await _picker.pickImage(
          source: ImageSource.camera,
          imageQuality: 85,
          maxWidth: 1800,
        );
        if (photo != null) {
          setState(() {
            if (_selectedImages.length < 8) {
              _selectedImages.add(photo);
            } else {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Maximum 8 images allowed.')),
                );
              }
            }
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking images: $e')),
        );
      }
    }
  }

  void _showImagePickerSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20.0, horizontal: 16.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
                child: Text(
                  'Add Property Photos',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(LucideIcons.camera, color: AppTheme.primary),
                ),
                title: const Text('Take Photo with Camera'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImages(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(LucideIcons.image, color: AppTheme.primary),
                ),
                title: const Text('Select from Photo Gallery'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImages(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _removeImage(int index) {
    setState(() => _selectedImages.removeAt(index));
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.user;
      if (user == null) return;

      final propertyProvider = Provider.of<PropertyProvider>(context, listen: false);
      final agentName = authProvider.userProfile?.fullName ?? user.displayName ?? 'Verified Agent';

      final success = await propertyProvider.createPropertyListing(
        title: _titleController.text.trim(),
        price: _priceController.text.trim(),
        address: _addressController.text.trim(),
        beds: int.tryParse(_bedsController.text) ?? 1,
        baths: int.tryParse(_bathsController.text) ?? 1,
        sqft: int.tryParse(_sqftController.text) ?? 1000,
        type: _selectedType,
        status: _selectedStatus,
        agentName: agentName,
        images: _selectedImages,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Property published successfully! 🏡✨'),
            backgroundColor: AppTheme.accent,
          ),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final propertyProvider = Provider.of<PropertyProvider>(context);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('List New Property'),
        elevation: 0.5,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Property Details 🏢', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: 6),
                Text('Publish your listing across the Wheelhomes network.', style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 24),

                // Title
                Text('Property Title', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Luxury 4-Bedroom Semi-Detached Duplex',
                    prefixIcon: Icon(LucideIcons.home, size: 20),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Please enter a title' : null,
                ),
                const SizedBox(height: 20),

                // Price & Status Row
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Price / Rent', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: _priceController,
                            decoration: const InputDecoration(
                              hintText: 'e.g. ₦3,500,000 / yr',
                              prefixIcon: Icon(LucideIcons.tag, size: 20),
                            ),
                            validator: (val) => val == null || val.isEmpty ? 'Please enter price' : null,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Status', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                          const SizedBox(height: 8),
                          DropdownButtonFormField<String>(
                            value: _selectedStatus,
                            items: _propertyStatuses.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 13)))).toList(),
                            onChanged: (val) => setState(() => _selectedStatus = val!),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Address
                Text('Location Address', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(
                    hintText: 'e.g. Admiralty Way, Lekki Phase 1, Lagos',
                    prefixIcon: Icon(LucideIcons.mapPin, size: 20),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Please enter location address' : null,
                ),
                const SizedBox(height: 20),

                // Property Type
                Text('Property Category', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _selectedType,
                  items: _propertyTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (val) => setState(() => _selectedType = val!),
                  decoration: const InputDecoration(
                    prefixIcon: Icon(LucideIcons.building, size: 20),
                  ),
                ),
                const SizedBox(height: 20),

                // Specs: Beds, Baths, SqFt
                Text('Specifications', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _bedsController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Beds',
                          prefixIcon: Icon(LucideIcons.bed, size: 18),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _bathsController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Baths',
                          prefixIcon: Icon(LucideIcons.bath, size: 18),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _sqftController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Sq Ft',
                          prefixIcon: Icon(LucideIcons.maximize2, size: 18),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Photo Upload Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Property Photos', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                    Text('${_selectedImages.length}/8', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 6),
                Text('High-quality photos significantly improve client inquiry rates.', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.textSecondary)),
                const SizedBox(height: 12),

                SizedBox(
                  height: 94,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      if (_selectedImages.length < 8)
                        GestureDetector(
                          onTap: _showImagePickerSheet,
                          child: Container(
                            width: 90,
                            height: 90,
                            margin: const EdgeInsets.only(right: 12),
                            decoration: BoxDecoration(
                              color: AppTheme.background,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4), width: 1.5),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.camera, color: AppTheme.primary, size: 24),
                                SizedBox(height: 6),
                                Text('Add Photo', style: TextStyle(color: AppTheme.primary, fontSize: 11, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),

                      ..._selectedImages.asMap().entries.map((entry) {
                        final index = entry.key;
                        final image = entry.value;
                        return Container(
                          width: 90,
                          height: 90,
                          margin: const EdgeInsets.only(right: 12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: kIsWeb
                                    ? Image.network(image.path, fit: BoxFit.cover)
                                    : Image.file(File(image.path), fit: BoxFit.cover),
                              ),
                              Positioned(
                                top: 4,
                                right: 4,
                                child: GestureDetector(
                                  onTap: () => _removeImage(index),
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: Colors.black87,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(LucideIcons.x, color: Colors.white, size: 12),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
                const SizedBox(height: 36),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: propertyProvider.isCreating ? null : _submit,
                    child: propertyProvider.isCreating
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Text('Publish Property Listing'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
