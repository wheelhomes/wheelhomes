import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class DocumentUploadScreen extends StatefulWidget {
  const DocumentUploadScreen({super.key});

  @override
  State<DocumentUploadScreen> createState() => _DocumentUploadScreenState();
}

class _DocumentUploadScreenState extends State<DocumentUploadScreen> {
  final ImagePicker _picker = ImagePicker();
  final PageController _pageController = PageController();

  // 4 Stepper Steps:
  // 0: Trade & Experience Bio
  // 1: Proof of Work & Job Photos
  // 2: Government ID Document
  // 3: Passport/Selfie & Review & Submit
  int _currentStep = 0;

  // Form Fields
  final TextEditingController _bioController = TextEditingController();
  String _selectedCategory = 'General Maintenance';
  final List<File> _jobPhotoFiles = [];
  final List<String> _existingJobPhotoUrls = [];

  File? _govIdFile;
  File? _passportFile;
  String _selectedIdType = 'National Identity Number (NIN)';
  bool _declarationAccepted = false;
  bool _isUploading = false;
  String _uploadProgressText = '';
  bool _initializedFromProfile = false;

  final List<String> _serviceCategories = [
    'General Maintenance',
    'Plumbing & Pipefitting',
    'Electrical & Wiring',
    'Carpentry & Woodwork',
    'Painting & Wall Finishes',
    'HVAC & AC Repair',
    'Masonry, Tiling & Flooring',
    'Roofing & Ceiling',
    'Cleaning & Fumigation',
    'Welding & Metal Fabrication',
    'Landscaping & Gardening',
    'Appliance Repair',
    'Solar & Inverter Systems',
  ];

  final List<Map<String, dynamic>> _idOptions = [
    {
      'title': 'National Identity Number (NIN)',
      'subtitle': 'NIN slip, digital NIN, or NIMC card',
      'icon': LucideIcons.badgeCheck,
      'badge': 'Recommended',
    },
    {
      'title': "Driver's License",
      'subtitle': 'FRSC issued valid driver license',
      'icon': LucideIcons.car,
    },
    {
      'title': 'International Passport',
      'subtitle': 'Valid biometric passport data page',
      'icon': LucideIcons.plane,
    },
    {
      'title': "Voter's Card (INEC PVC)",
      'subtitle': 'Permanent voter card with visible VIN',
      'icon': LucideIcons.vote,
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initProfileData();
    });
  }

  void _initProfileData() {
    if (_initializedFromProfile) return;
    final profile = Provider.of<AuthProvider>(context, listen: false).userProfile;
    if (profile != null) {
      if (profile.bio != null && profile.bio!.isNotEmpty && _bioController.text.isEmpty) {
        _bioController.text = profile.bio!;
      }
      if (profile.serviceCategory != null && profile.serviceCategory!.isNotEmpty) {
        if (_serviceCategories.contains(profile.serviceCategory)) {
          _selectedCategory = profile.serviceCategory!;
        }
      }
      if (profile.idType != null && profile.idType!.isNotEmpty) {
        _selectedIdType = profile.idType!;
      }
      if (profile.jobPhotos.isNotEmpty) {
        _existingJobPhotoUrls.addAll(profile.jobPhotos);
      }
      setState(() {
        _initializedFromProfile = true;
      });
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  void _goToStep(int step) {
    if (step < 0 || step > 3) return;
    setState(() => _currentStep = step);
    _pageController.animateToPage(
      step,
      duration: const Duration(milliseconds: 320),
      curve: Curves.easeInOutCubic,
    );
  }

  void _handleBack() {
    if (_isUploading) return;
    if (_currentStep > 0) {
      _goToStep(_currentStep - 1);
    } else {
      _showChangeRoleDialog();
    }
  }

  void _showChangeRoleDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(LucideIcons.arrowLeft, color: AppTheme.primary, size: 20),
            SizedBox(width: 8),
            Text('Go Back to Roles?'),
          ],
        ),
        content: const Text(
          'Would you like to return to the role selection screen and choose a different account type (e.g. Client / Buyer)?',
          style: TextStyle(fontSize: 14, color: AppTheme.textSecondary, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Stay Here'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final authProvider = Provider.of<AuthProvider>(context, listen: false);
              await authProvider.selectRole('pending_role_selection');
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
            child: const Text('Change Role'),
          ),
        ],
      ),
    );
  }

  // Pick Gov ID or Passport Photo
  Future<void> _pickImage({
    required bool isGovId,
    required ImageSource source,
  }) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );
      if (picked != null) {
        setState(() {
          if (isGovId) {
            _govIdFile = File(picked.path);
          } else {
            _passportFile = File(picked.path);
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick photo: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  void _showImageSourceSheet({required bool isGovId}) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                isGovId ? 'Upload Government ID' : 'Upload Passport Photograph',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.camera, color: AppTheme.primary),
                ),
                title: const Text('Take Photo with Camera'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(isGovId: isGovId, source: ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.image, color: AppTheme.accent),
                ),
                title: const Text('Choose from Photo Gallery'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImage(isGovId: isGovId, source: ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Pick Proof of Work / Job Photos
  Future<void> _pickJobPhotos({required ImageSource source}) async {
    final totalCurrent = _jobPhotoFiles.length + _existingJobPhotoUrls.length;
    if (totalCurrent >= 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Maximum 5 job photos allowed.')),
      );
      return;
    }

    try {
      if (source == ImageSource.gallery) {
        final pickedList = await _picker.pickMultiImage(
          maxWidth: 1600,
          maxHeight: 1600,
          imageQuality: 85,
        );
        if (pickedList.isNotEmpty) {
          setState(() {
            for (final xFile in pickedList) {
              if (_jobPhotoFiles.length + _existingJobPhotoUrls.length < 5) {
                _jobPhotoFiles.add(File(xFile.path));
              }
            }
          });
        }
      } else {
        final picked = await _picker.pickImage(
          source: ImageSource.camera,
          maxWidth: 1600,
          maxHeight: 1600,
          imageQuality: 85,
        );
        if (picked != null) {
          setState(() {
            if (_jobPhotoFiles.length + _existingJobPhotoUrls.length < 5) {
              _jobPhotoFiles.add(File(picked.path));
            }
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick photo: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  void _showJobPhotoSourceSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Add Proof of Work / Job Photo',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                'Upload photos of completed projects, repairs, or installations.',
                style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.camera, color: AppTheme.primary),
                ),
                title: const Text('Take Photo with Camera'),
                subtitle: const Text('Capture photo directly on site'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickJobPhotos(source: ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.accent.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.image, color: AppTheme.accent),
                ),
                title: const Text('Choose from Photo Gallery'),
                subtitle: const Text('Select one or multiple job photos'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickJobPhotos(source: ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Handle Complete Submission
  Future<void> _handleSubmit() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final profile = authProvider.userProfile;
    final hasGovId = _govIdFile != null || (profile?.govIdUrl != null && profile!.govIdUrl!.isNotEmpty);
    final hasPassport = _passportFile != null || (profile?.passportUrl != null && profile!.passportUrl!.isNotEmpty);

    if (!hasGovId || !hasPassport) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please upload both your Government ID and Passport Photo.'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    if (!_declarationAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please accept the authenticity declaration.'),
          backgroundColor: AppTheme.error,
        ),
      );
      return;
    }

    setState(() {
      _isUploading = true;
      _uploadProgressText = 'Uploading documents and work photos to secure storage...';
    });

    try {
      final success = await authProvider.submitKycVerification(
        idType: _selectedIdType,
        govIdFile: _govIdFile!,
        passportFile: _passportFile!,
        jobPhotoFiles: _jobPhotoFiles,
        bio: _bioController.text.trim(),
        serviceCategory: _selectedCategory,
      );

      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Onboarding documents submitted! Your account is now under pending review.'),
            backgroundColor: AppTheme.accent,
            duration: Duration(seconds: 4),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? 'Submission failed. Please try again.'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Submission notice: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
          _uploadProgressText = '';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final profile = authProvider.userProfile;
    final status = profile?.status ?? 'unverified';
    final isVerified = profile?.isVerified == true;

    if (isVerified) {
      return Scaffold(
        appBar: AppBar(title: const Text('Verification')),
        body: Center(child: _buildVerifiedState()),
      );
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        _handleBack();
      },
      child: Scaffold(
        backgroundColor: AppTheme.background,
        appBar: AppBar(
          elevation: 0,
          backgroundColor: Colors.white,
          leading: IconButton(
            icon: const Icon(LucideIcons.arrowLeft, color: AppTheme.textPrimary),
            tooltip: _currentStep > 0 ? 'Previous Step' : 'Back to Roles',
            onPressed: _handleBack,
          ),
          title: Text(
            _getStepTitle(),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppTheme.textPrimary,
            ),
          ),
          actions: [
            Container(
              margin: const EdgeInsets.only(right: 16),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Step ${_currentStep + 1} of 4',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primary,
                ),
              ),
            ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(48),
            child: _buildStepProgressBar(),
          ),
        ),
        body: PageView(
          controller: _pageController,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            _buildStep0TradeAndBio(status, profile?.rejectionReason),
            _buildStep1JobPhotos(),
            _buildStep2GovId(profile?.govIdUrl),
            _buildStep3PassportAndSubmit(profile?.passportUrl),
          ],
        ),
      ),
    );
  }

  String _getStepTitle() {
    switch (_currentStep) {
      case 0:
        return 'Trade & Experience';
      case 1:
        return 'Proof of Work & Photos';
      case 2:
        return 'Government ID';
      case 3:
        return 'Selfie & Review';
      default:
        return 'Onboarding & KYC';
    }
  }

  // Visual Stepper Progress Bar (4 Steps)
  Widget _buildStepProgressBar() {
    final progress = (_currentStep + 1) / 4.0;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        children: [
          Row(
            children: [
              _buildStepDot(0, 'Trade', LucideIcons.briefcase),
              _buildStepConnector(0),
              _buildStepDot(1, 'Photos', LucideIcons.camera),
              _buildStepConnector(1),
              _buildStepDot(2, 'Gov ID', LucideIcons.fileText),
              _buildStepConnector(2),
              _buildStepDot(3, 'Review', LucideIcons.userCheck),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: AppTheme.border,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
              minHeight: 3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepDot(int step, String label, IconData icon) {
    final isDone = _currentStep > step;
    final isCurrent = _currentStep == step;

    Color color;
    Color textColor;
    if (isDone) {
      color = AppTheme.accent;
      textColor = AppTheme.accent;
    } else if (isCurrent) {
      color = AppTheme.primary;
      textColor = AppTheme.primary;
    } else {
      color = AppTheme.textSecondary.withValues(alpha: 0.4);
      textColor = AppTheme.textSecondary;
    }

    return GestureDetector(
      onTap: () {
        if (step < _currentStep) {
          _goToStep(step);
        }
      },
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: isDone
                  ? AppTheme.accent
                  : (isCurrent ? AppTheme.primary : Colors.transparent),
              border: Border.all(color: color, width: 1.5),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: isDone
                  ? const Icon(LucideIcons.check, size: 11, color: Colors.white)
                  : Text(
                      '${step + 1}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isCurrent ? Colors.white : textColor,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepConnector(int step) {
    final isDone = _currentStep > step;
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.symmetric(horizontal: 4),
        color: isDone ? AppTheme.accent : AppTheme.border,
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 0: Trade & Bio Experience
  // ─────────────────────────────────────────────────────────────
  Widget _buildStep0TradeAndBio(String status, [String? rejectionReason]) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (status == 'rejected') ...[
            _buildStatusHeader(status, rejectionReason),
            const SizedBox(height: 16),
          ],

          // Intro banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(LucideIcons.briefcase, color: AppTheme.primary, size: 24),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Trade Profile & Experience',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Tell homeowners and verification officers about your craftsmanship, trade category, and practical experience.',
                        style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Primary Trade Category
          const Text(
            'Primary Trade & Capabilities *',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: _selectedCategory,
                icon: const Icon(LucideIcons.chevronDown, size: 18, color: AppTheme.textSecondary),
                items: _serviceCategories.map((cat) {
                  return DropdownMenuItem<String>(
                    value: cat,
                    child: Row(
                      children: [
                        const Icon(LucideIcons.wrench, size: 16, color: AppTheme.accent),
                        const SizedBox(width: 10),
                        Text(cat, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedCategory = val);
                },
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Trade Bio & Experience
          const Text(
            'Trade Bio & Practical Experience *',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 4),
          const Text(
            'Mention your years of experience, specific skills, and previous projects.',
            style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: TextField(
              controller: _bioController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'e.g. Over 5 years of certified residential and commercial plumbing experience. Specializing in pipe leak detection, bathroom fittings, solar water heaters, and borehole connections.',
                hintStyle: TextStyle(fontSize: 13, color: Colors.grey),
                contentPadding: EdgeInsets.all(14),
                border: InputBorder.none,
              ),
            ),
          ),

          const SizedBox(height: 32),

          // Next Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                if (_bioController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Please enter a brief trade bio to describe your experience.'),
                      backgroundColor: AppTheme.error,
                    ),
                  );
                  return;
                }
                _goToStep(1);
              },
              icon: const Icon(LucideIcons.arrowRight, size: 18),
              label: const Text('Next: Proof of Work Photos', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                backgroundColor: AppTheme.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 1: Proof of Work & Job Photos
  // ─────────────────────────────────────────────────────────────
  Widget _buildStep1JobPhotos() {
    final totalPhotos = _jobPhotoFiles.length + _existingJobPhotoUrls.length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.camera, color: AppTheme.accent, size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Proof of Work & Job Photos',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      'Photos of past completed jobs, installations, or projects',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Benefit notice card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFBFDBFE)),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(LucideIcons.sparkles, size: 18, color: Color(0xFF0284C7)),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Applicants with clear photos of past completed work receive faster approval and up to 3x more client hiring requests.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF0369A1), height: 1.4),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Counter header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Work Photos (Up to 5)',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: totalPhotos > 0 ? const Color(0xFFECFDF5) : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: totalPhotos > 0 ? const Color(0xFFA7F3D0) : Colors.grey.shade300,
                  ),
                ),
                child: Text(
                  '$totalPhotos / 5 uploaded',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: totalPhotos > 0 ? const Color(0xFF047857) : AppTheme.textSecondary,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Photos Grid
          if (totalPhotos == 0) ...[
            InkWell(
              onTap: _showJobPhotoSourceSheet,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border, style: BorderStyle.solid),
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.accent.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(LucideIcons.imagePlus, size: 36, color: AppTheme.accent),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'No job photos added yet',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tap to upload photos of repairs, installations, or completed work',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: _showJobPhotoSourceSheet,
                      icon: const Icon(LucideIcons.plus, size: 16),
                      label: const Text('Add Job Photo(s)'),
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ] else ...[
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.15,
              ),
              itemCount: totalPhotos + (totalPhotos < 5 ? 1 : 0),
              itemBuilder: (ctx, idx) {
                // "Add More" tile
                if (idx == totalPhotos && totalPhotos < 5) {
                  return InkWell(
                    onTap: _showJobPhotoSourceSheet,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.accent, width: 1.5),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(LucideIcons.plusCircle, color: AppTheme.accent, size: 28),
                          SizedBox(height: 6),
                          Text(
                            'Add Photo',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.accent),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                // Render existing remote photos first
                if (idx < _existingJobPhotoUrls.length) {
                  final url = _existingJobPhotoUrls[idx];
                  return _buildPhotoTile(
                    label: 'Proof #${idx + 1}',
                    imageWidget: Image.network(url, fit: BoxFit.cover),
                    onDelete: () => setState(() => _existingJobPhotoUrls.removeAt(idx)),
                  );
                }

                // Render local files
                final localIdx = idx - _existingJobPhotoUrls.length;
                final file = _jobPhotoFiles[localIdx];
                return _buildPhotoTile(
                  label: 'Proof #${idx + 1}',
                  imageWidget: Image.file(file, fit: BoxFit.cover),
                  onDelete: () => setState(() => _jobPhotoFiles.removeAt(localIdx)),
                );
              },
            ),

            const SizedBox(height: 12),
            if (totalPhotos < 5)
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: _showJobPhotoSourceSheet,
                  icon: const Icon(LucideIcons.plus, size: 14),
                  label: Text('Add More Photos (${5 - totalPhotos} left)', style: const TextStyle(fontSize: 12)),
                ),
              ),
          ],

          const SizedBox(height: 28),

          // Navigation buttons: Back & Next
          Row(
            children: [
              Expanded(
                flex: 2,
                child: OutlinedButton.icon(
                  onPressed: () => _goToStep(0),
                  icon: const Icon(LucideIcons.arrowLeft, size: 16),
                  label: const Text('Back', style: TextStyle(fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (totalPhotos == 0) {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('No Job Photos Added'),
                          content: const Text(
                            'Adding at least 1 job photo showing your real work is strongly recommended to get verified by the admin team. Continue anyway?',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('Add Photos Now'),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                _goToStep(2);
                              },
                              child: const Text('Continue'),
                            ),
                          ],
                        ),
                      );
                    } else {
                      _goToStep(2);
                    }
                  },
                  icon: const Icon(LucideIcons.arrowRight, size: 18),
                  label: const Text('Next: Government ID', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildPhotoTile({
    required String label,
    required Widget imageWidget,
    required VoidCallback onDelete,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(11),
        child: Stack(
          fit: StackFit.expand,
          children: [
            imageWidget,
            // Gradient Overlay for visibility
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.black54, Colors.transparent],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        label,
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                    GestureDetector(
                      onTap: onDelete,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: AppTheme.error,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(LucideIcons.trash2, size: 12, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 2: Government ID (Select Type + Upload)
  // ─────────────────────────────────────────────────────────────
  Widget _buildStep2GovId(String? existingUrl) {
    final hasDoc = _govIdFile != null || (existingUrl != null && existingUrl.isNotEmpty);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.fileText, color: AppTheme.primary, size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Government ID Verification',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      'Select an official ID type and upload a clear photo',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 18),

          const Text(
            'Select Document Type:',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary),
          ),
          const SizedBox(height: 10),

          // ID Selection Cards
          ..._idOptions.map((opt) {
            final isSelected = _selectedIdType == opt['title'];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                onTap: () => setState(() => _selectedIdType = opt['title'] as String),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppTheme.primary.withValues(alpha: 0.05)
                        : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? AppTheme.primary : AppTheme.border,
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        opt['icon'] as IconData,
                        color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          opt['title'] as String,
                          style: TextStyle(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            fontSize: 13,
                            color: isSelected ? AppTheme.primary : AppTheme.textPrimary,
                          ),
                        ),
                      ),
                      if (isSelected)
                        const Icon(LucideIcons.checkCircle2, color: AppTheme.primary, size: 18),
                    ],
                  ),
                ),
              ),
            );
          }),

          const SizedBox(height: 16),

          // Upload Box
          _buildUploadBox(
            title: '$_selectedIdType Document',
            subtitle: 'Upload a clear, legible picture. All four edges of the card/slip must be visible.',
            icon: LucideIcons.fileText,
            localFile: _govIdFile,
            existingUrl: existingUrl,
            onTap: () => _showImageSourceSheet(isGovId: true),
            onClear: () => setState(() => _govIdFile = null),
          ),

          const SizedBox(height: 28),

          // Navigation buttons: Back & Next
          Row(
            children: [
              Expanded(
                flex: 2,
                child: OutlinedButton.icon(
                  onPressed: () => _goToStep(1),
                  icon: const Icon(LucideIcons.arrowLeft, size: 16),
                  label: const Text('Back', style: TextStyle(fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: hasDoc ? () => _goToStep(3) : null,
                  icon: const Icon(LucideIcons.arrowRight, size: 18),
                  label: const Text('Next: Selfie & Review', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: AppTheme.primary,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 3: Upload Passport / Selfie & Review & Submit
  // ─────────────────────────────────────────────────────────────
  Widget _buildStep3PassportAndSubmit(String? existingUrl) {
    final hasPassport = _passportFile != null || (existingUrl != null && existingUrl.isNotEmpty);
    final authProvider = Provider.of<AuthProvider>(context);
    final profile = authProvider.userProfile;
    final hasGovId = _govIdFile != null || (profile?.govIdUrl != null && profile!.govIdUrl!.isNotEmpty);
    final canSubmit = hasGovId && hasPassport && _declarationAccepted && !_isUploading;
    final totalWorkPhotos = _jobPhotoFiles.length + _existingJobPhotoUrls.length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.accent.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.user, color: AppTheme.accent, size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Passport Photograph / Selfie',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      'Clear front-facing headshot on a plain background',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Upload Box
          _buildUploadBox(
            title: 'Passport Photo / Headshot',
            subtitle: 'Looking directly at camera, with good lighting and no hats/sunglasses.',
            icon: LucideIcons.user,
            localFile: _passportFile,
            existingUrl: existingUrl,
            onTap: () => _showImageSourceSheet(isGovId: false),
            onClear: () => setState(() => _passportFile = null),
          ),

          const SizedBox(height: 20),

          // Verification Summary Box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Application Dossier Summary',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                const SizedBox(height: 10),
                _buildSummaryRow(
                  label: 'Trade Category',
                  value: _selectedCategory,
                  isOk: true,
                ),
                const Divider(height: 14),
                _buildSummaryRow(
                  label: 'Trade Bio',
                  value: _bioController.text.trim().isNotEmpty
                      ? '${_bioController.text.trim().substring(0, min(28, _bioController.text.trim().length))}...'
                      : 'None provided',
                  isOk: _bioController.text.trim().isNotEmpty,
                ),
                const Divider(height: 14),
                _buildSummaryRow(
                  label: 'Proof of Work Photos',
                  value: totalWorkPhotos > 0 ? '$totalWorkPhotos Photos Attached ✅' : '0 Photos (Recommended)',
                  isOk: totalWorkPhotos > 0,
                ),
                const Divider(height: 14),
                _buildSummaryRow(
                  label: 'Government ID (${_getShortIdType(_selectedIdType)})',
                  value: hasGovId ? 'Attached ✅' : 'Missing ⚠️',
                  isOk: hasGovId,
                ),
                const Divider(height: 14),
                _buildSummaryRow(
                  label: 'Passport Photo / Headshot',
                  value: hasPassport ? 'Attached ✅' : 'Missing ⚠️',
                  isOk: hasPassport,
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Declaration Checkbox
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _declarationAccepted,
            onChanged: (val) => setState(() => _declarationAccepted = val ?? false),
            controlAffinity: ListTileControlAffinity.leading,
            title: const Text(
              'I certify under penalty of perjury that all identity documents, trade details, and work proof photos provided are genuine, unaltered, and belong to me.',
              style: TextStyle(fontSize: 12, color: AppTheme.textSecondary, height: 1.3),
            ),
          ),

          const SizedBox(height: 24),

          // Navigation buttons: Back & Submit
          Row(
            children: [
              Expanded(
                flex: 2,
                child: OutlinedButton.icon(
                  onPressed: _isUploading ? null : () => _goToStep(2),
                  icon: const Icon(LucideIcons.arrowLeft, size: 16),
                  label: const Text('Back', style: TextStyle(fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 4,
                child: ElevatedButton.icon(
                  onPressed: canSubmit ? _handleSubmit : null,
                  icon: _isUploading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(LucideIcons.shieldCheck, size: 18),
                  label: Text(
                    _isUploading ? 'Submitting...' : 'Submit Documents',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: AppTheme.accent,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),

          if (_isUploading && _uploadProgressText.isNotEmpty) ...[
            const SizedBox(height: 12),
            Center(
              child: Text(
                _uploadProgressText,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
            ),
          ],

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  String _getShortIdType(String fullType) {
    if (fullType.contains('NIN')) return 'NIN';
    if (fullType.contains('Driver')) return "Driver's Lic.";
    if (fullType.contains('Passport')) return 'Passport';
    if (fullType.contains('Voter')) return 'Voter Card';
    return fullType;
  }

  Widget _buildSummaryRow({
    required String label,
    required String value,
    required bool isOk,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 5,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 6,
            child: Text(
              value,
              textAlign: TextAlign.end,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: isOk ? AppTheme.accent : AppTheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusHeader(String status, [String? rejectionReason]) {
    if (status == 'rejected') {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.error.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.error),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(LucideIcons.alertTriangle, color: AppTheme.error, size: 20),
                SizedBox(width: 8),
                Text(
                  'Application Needs Updates',
                  style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.error, fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              rejectionReason ?? 'Please update your trade details and re-upload clear identity photos.',
              style: const TextStyle(fontSize: 12, color: AppTheme.textPrimary, height: 1.3),
            ),
          ],
        ),
      );
    }
    return const SizedBox.shrink();
  }

  // Helper: Upload Box
  Widget _buildUploadBox({
    required String title,
    required String subtitle,
    required IconData icon,
    required File? localFile,
    required String? existingUrl,
    required VoidCallback onTap,
    required VoidCallback onClear,
  }) {
    final hasImage = localFile != null || (existingUrl != null && existingUrl.isNotEmpty);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: hasImage ? AppTheme.accent : AppTheme.border,
            width: hasImage ? 1.5 : 1,
          ),
        ),
        child: Column(
          children: [
            if (hasImage) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  height: 180,
                  width: double.infinity,
                  color: Colors.grey[100],
                  child: localFile != null
                      ? Image.file(localFile, fit: BoxFit.cover)
                      : Image.network(
                          existingUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Center(
                            child: Icon(LucideIcons.fileWarning, size: 40, color: Colors.grey),
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(LucideIcons.checkCircle2, color: AppTheme.accent, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'Document Attached',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.accent),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      TextButton.icon(
                        onPressed: onTap,
                        icon: const Icon(LucideIcons.refreshCw, size: 14),
                        label: const Text('Replace', style: TextStyle(fontSize: 12)),
                      ),
                      if (localFile != null)
                        TextButton.icon(
                          onPressed: onClear,
                          icon: const Icon(LucideIcons.trash2, size: 14, color: AppTheme.error),
                          label: const Text('Remove', style: TextStyle(fontSize: 12, color: AppTheme.error)),
                        ),
                    ],
                  ),
                ],
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.08),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: AppTheme.primary, size: 32),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
              ),
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: onTap,
                icon: const Icon(LucideIcons.camera, size: 16),
                label: const Text('Take Photo or Pick File'),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildVerifiedState() {
    return Container(
      padding: const EdgeInsets.all(24),
      margin: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.accent.withValues(alpha: 0.3)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.accent.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.badgeCheck, color: AppTheme.accent, size: 48),
          ),
          const SizedBox(height: 16),
          const Text(
            'Account Verified!',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
          ),
          const SizedBox(height: 8),
          const Text(
            'Your identity and trade credentials have been approved. You have full access to accept client bookings and list services.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
            child: const Text('Back to Home'),
          ),
        ],
      ),
    );
  }
}
