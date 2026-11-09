import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme.dart';
import '../../core/service_categories.dart';
import '../../providers/auth_provider.dart';
import '../../providers/request_provider.dart';
import '../../providers/service_provider_directory_provider.dart';
import '../../services/firestore_service.dart';

class CreateRequestScreen extends StatefulWidget {
  final String? initialCategory;
  final String? targetProviderId;
  final String? targetProviderName;

  const CreateRequestScreen({
    super.key,
    this.initialCategory,
    this.targetProviderId,
    this.targetProviderName,
  });

  @override
  State<CreateRequestScreen> createState() => _CreateRequestScreenState();
}

class _CreateRequestScreenState extends State<CreateRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _picker = ImagePicker();
  final List<XFile> _selectedImages = [];
  
  late String _selectedService;
  String _selectedState = 'Lagos';
  String _preferredTime = 'As soon as possible (Today)';
  bool _userOverrodeState = false;
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();
  final _budgetController = TextEditingController();

  static const List<String> _timeOptions = [
    'As soon as possible (Today)',
    'Morning (8:00 AM – 12:00 PM)',
    'Afternoon (12:00 PM – 4:00 PM)',
    'Evening (4:00 PM – 7:00 PM)',
    'Tomorrow Morning',
    'This Weekend',
  ];

  List<String> get _stateNames =>
      FirestoreService.nigerianStates.map((s) => s['name'] as String).toList();

  List<String> get _services {
    final active = List<String>.from(ServiceCategories.list);
    if (_selectedService.isNotEmpty && !active.contains(_selectedService)) {
      active.insert(0, _selectedService);
    }
    return active;
  }

  @override
  void initState() {
    super.initState();
    final initialList = ServiceCategories.list;
    if (widget.initialCategory != null && widget.initialCategory!.trim().isNotEmpty) {
      _selectedService = ServiceCategories.normalize(widget.initialCategory);
    } else {
      _selectedService = initialList.first;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final profile = Provider.of<AuthProvider>(context, listen: false).userProfile;
      if (profile != null) {
        final detected = FirestoreService.detectClientState(userData: profile.rawData);
        setState(() {
          _selectedState = detected['name'] ?? 'Lagos';
        });
      }
    });
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _addressController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      if (source == ImageSource.gallery) {
        final List<XFile> picked = await _picker.pickMultiImage(
          imageQuality: 80,
          maxWidth: 1600,
        );
        if (picked.isNotEmpty) {
          setState(() {
            _selectedImages.addAll(picked);
            if (_selectedImages.length > 5) {
              _selectedImages.removeRange(5, _selectedImages.length);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Maximum 5 images allowed.')),
              );
            }
          });
        }
      } else {
        final XFile? photo = await _picker.pickImage(
          source: ImageSource.camera,
          imageQuality: 80,
          maxWidth: 1600,
        );
        if (photo != null) {
          setState(() {
            if (_selectedImages.length < 5) {
              _selectedImages.add(photo);
            } else {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Maximum 5 images allowed.')),
              );
            }
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking image: $e')),
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
                  'Attach Photos of the Issue',
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
                  _pickImage(ImageSource.camera);
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
                title: const Text('Choose from Photo Gallery'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  void _submit() async {
    if (_formKey.currentState!.validate()) {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      if (user == null) return;

      final requestProvider = Provider.of<RequestProvider>(context, listen: false);
      final budget = double.tryParse(_budgetController.text);

      final success = await requestProvider.createRequest(
        userId: user.uid,
        serviceType: _selectedService,
        description: _descriptionController.text,
        location: {
          'address': _addressController.text,
          'state': _selectedState,
        },
        price: budget,
        images: _selectedImages,
        providerId: widget.targetProviderId,
        providerName: widget.targetProviderName,
        clientState: _selectedState,
        preferredTime: _preferredTime,
      );

      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Routed directly to $_selectedState $_selectedService HOD! 🎉',
            ),
            backgroundColor: AppTheme.accent,
          ),
        );
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userProfile = authProvider.userProfile;

    if (userProfile?.role == 'service_provider') {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: const Text('Service Requests'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.briefcase, size: 48, color: AppTheme.primary),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Service Provider Account',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text(
                  'As an artisan, you fulfill client service requests rather than creating new requests. Check the Provider Job Hub to view available jobs.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppTheme.textSecondary, height: 1.4),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Back to Home'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final requestProvider = Provider.of<RequestProvider>(context);
    // Watch ServiceProviderDirectoryProvider so live admin changes to active service types rebuild the dropdown
    Provider.of<ServiceProviderDirectoryProvider>(context);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text(widget.targetProviderName != null ? 'Book Specialist' : 'New Service Request'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.targetProviderName != null) ...[
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFBBF7D0)),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.shieldCheck, color: Color(0xFF047857), size: 24),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Direct Booking with Verified Specialist',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                widget.targetProviderName!,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                Text(
                  widget.targetProviderName != null
                      ? 'Describe your project requirements'
                      : 'What service do you need? 🛠️',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  widget.targetProviderName != null
                      ? 'This job request will be delivered directly to this verified artisan.'
                      : 'Fill out details to get connected with verified service providers.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),

                Text('Service Category', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _selectedService,
                  isExpanded: true,
                  items: _services.map((s) {
                    final icon = ServiceCategories.getIcon(s);
                    final color = ServiceCategories.getColor(s);
                    return DropdownMenuItem<String>(
                      value: s,
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: color.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Icon(icon, size: 16, color: color),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              s,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _selectedService = val);
                    }
                  },
                  decoration: InputDecoration(
                    prefixIcon: Icon(
                      ServiceCategories.getIcon(_selectedService),
                      size: 20,
                      color: ServiceCategories.getColor(_selectedService),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 20),

                // Smart Location & HOD Routing Banner
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(LucideIcons.shieldCheck, size: 18, color: Color(0xFF047857)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Direct Routing: $_selectedState $_selectedService HOD',
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF065F46),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Your request goes straight to the Head of Department (HOD) for $_selectedService in $_selectedState, who will dispatch the nearest technician to your location.',
                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF047857), height: 1.35),
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: _stateNames.contains(_selectedState) ? _selectedState : 'Lagos',
                        isExpanded: true,
                        items: _stateNames
                            .map(
                              (st) => DropdownMenuItem<String>(
                                value: st,
                                child: Text(
                                  '$st State (Auto-detected)',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() {
                              _selectedState = val;
                              _userOverrodeState = true;
                            });
                          }
                        },
                        decoration: const InputDecoration(
                          labelText: 'Detected State Location',
                          prefixIcon: Icon(LucideIcons.mapPin, size: 18),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                Text('Street Address / Landmark', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _addressController,
                  onChanged: (val) {
                    if (!_userOverrodeState && val.trim().length > 3) {
                      final detected = FirestoreService.matchNigerianState(val);
                      if (detected['name'] != null && detected['name'] != _selectedState) {
                        setState(() => _selectedState = detected['name']!);
                      }
                    }
                  },
                  decoration: InputDecoration(
                    hintText: 'House No., Street, Area in $_selectedState',
                    prefixIcon: const Icon(LucideIcons.mapPin, size: 20),
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Please enter address' : null,
                ),
                const SizedBox(height: 20),

                Text('Preferred Visit Time', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  initialValue: _preferredTime,
                  isExpanded: true,
                  items: _timeOptions
                      .map((t) => DropdownMenuItem<String>(
                            value: t,
                            child: Text(t, style: const TextStyle(fontSize: 13.5)),
                          ))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _preferredTime = val);
                  },
                  decoration: const InputDecoration(
                    prefixIcon: Icon(LucideIcons.clock, size: 18),
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
                const SizedBox(height: 20),

                Text('Description of Issue', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText: 'Describe the issue or service requirement in detail...',
                  ),
                  validator: (val) => val == null || val.isEmpty ? 'Please enter description' : null,
                ),
                const SizedBox(height: 20),

                // Photos Attachment Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Photos of Issue (Optional)', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                    Text('${_selectedImages.length}/5', style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                Text('Add photos to help service providers diagnose the issue faster.', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppTheme.textSecondary)),
                const SizedBox(height: 12),

                SizedBox(
                  height: 94,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      // Add Button
                      if (_selectedImages.length < 5)
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

                      // Image Previews
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
                const SizedBox(height: 20),

                Text('Estimated Budget (Optional)', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 14)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _budgetController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    hintText: 'e.g. 15000',
                    prefixIcon: Icon(LucideIcons.dollarSign, size: 20),
                  ),
                ),
                const SizedBox(height: 32),

                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: requestProvider.isSubmitting ? null : _submit,
                    child: requestProvider.isSubmitting
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                          )
                        : const Text('Submit Request'),
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
