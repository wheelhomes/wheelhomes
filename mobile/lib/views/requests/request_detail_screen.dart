import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/chat_sound.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/call_provider.dart';
import '../../core/image_helper.dart';
import '../../models/request_model.dart';
import '../../models/user_model.dart';
import '../../providers/request_provider.dart';
import '../../providers/payment_provider.dart';
import '../../services/auth_service.dart';
import '../chat/chat_screen.dart';
import '../payment/payment_checkout_screen.dart';

class RequestDetailScreen extends StatefulWidget {
  final ServiceRequestModel request;

  const RequestDetailScreen({super.key, required this.request});

  @override
  State<RequestDetailScreen> createState() => _RequestDetailScreenState();
}

class _RequestDetailScreenState extends State<RequestDetailScreen> {
  UserProfile? _providerProfile;
  bool _isLoadingProvider = false;

  @override
  void initState() {
    super.initState();
    _fetchProviderInfo();
  }

  void _fetchProviderInfo() async {
    final providerId = widget.request.providerId ?? widget.request.hodId;
    if (providerId != null && providerId.isNotEmpty) {
      setState(() => _isLoadingProvider = true);
      try {
        final profile = await AuthService().getUserProfile(providerId);
        if (mounted) {
          setState(() {
            _providerProfile = profile;
            _isLoadingProvider = false;
          });
        }
      } catch (_) {
        if (mounted) setState(() => _isLoadingProvider = false);
      }
    }
  }

  // Helper to resolve real-time request from provider list if updated
  ServiceRequestModel _resolveCurrentRequest(BuildContext context) {
    final reqProvider = Provider.of<RequestProvider>(context);
    final match = reqProvider.userRequests.where((r) => r.id == widget.request.id);
    return match.isNotEmpty ? match.first : widget.request;
  }

  @override
  Widget build(BuildContext context) {
    final req = _resolveCurrentRequest(context);
    final status = req.status.toLowerCase();
    final isPending = status == 'pending' || status == 'open';
    final isCompleted = status == 'completed' || status == 'fully_completed';

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(req.serviceType, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            GestureDetector(
              onTap: () {
                Clipboard.setData(ClipboardData(text: req.displayRequestCode));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Request ID #${req.displayRequestCode} copied!')),
                );
              },
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Request ID: #${req.displayRequestCode}',
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF6B21A8), fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(width: 4),
                  const Icon(LucideIcons.copy, size: 11, color: Color(0xFF6B21A8)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (!isPending && status != 'cancelled' && status != 'rejected')
            IconButton(
              tooltip: 'Chat with Department HOD',
              icon: const Icon(LucideIcons.messageSquare, size: 20),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ChatScreen(
                      title: req.hodName ?? req.serviceType,
                      subtitle: req.location['address'] ?? 'Service Request',
                      jobId: req.id,
                    ),
                  ),
                );
              },
            ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Status Banner & Timeline
              _buildStatusHeader(req, status),
              const SizedBox(height: 16),

              // 2. Lifecycle Stepper
              _buildProgressStepper(req, status),
              const SizedBox(height: 20),

              // 3. Assigned HOD & Dispatched Assistant Card
              if ((req.providerId != null && req.providerId!.isNotEmpty) ||
                  (req.hodName != null && req.hodName!.isNotEmpty) ||
                  (req.assistantName != null && req.assistantName!.isNotEmpty)) ...[
                _buildProviderCard(context, req),
                const SizedBox(height: 20),
              ],

              // 4. Escrow Financial & Protection Card
              _buildEscrowCard(context, req),
              const SizedBox(height: 20),

              // 5. Job Description & Details
              _buildJobInfoCard(req),
              const SizedBox(height: 20),

              // 6. Client Attached Photos
              if (req.images.isNotEmpty) ...[
                _buildPhotosCard(context, req),
                const SizedBox(height: 20),
              ],

              // 7. Rating & Review Section (if completed)
              if (isCompleted || req.paymentStatus == 'released') ...[
                _buildReviewSection(context, req),
                const SizedBox(height: 20),
              ],

              // 8. Cancel Option (only if pending/open)
              if (isPending) ...[
                Center(
                  child: TextButton.icon(
                    onPressed: () => _confirmCancel(context, req),
                    icon: const Icon(LucideIcons.xCircle, color: AppTheme.error, size: 16),
                    label: const Text(
                      'Cancel This Request',
                      style: TextStyle(color: AppTheme.error, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // STATUS HEADER
  // -------------------------------------------------------------
  Widget _buildStatusHeader(ServiceRequestModel req, String status) {
    Color badgeColor;
    Color badgeBg;
    String statusTitle;
    String statusSubtitle;
    IconData statusIcon;

    if (status == 'completed' || status == 'fully_completed') {
      badgeColor = const Color(0xFF047857);
      badgeBg = const Color(0xFFECFDF5);
      statusTitle = 'Job Approved — Well Done 🎉';
      statusSubtitle = req.paymentStatus == 'released' || req.paymentStatus == 'escrow_held'
          ? 'Payment completed. Thank you for using Wheel of Comfort!'
          : 'You approved that the job is well done. You can now proceed to make payment below.';
      statusIcon = LucideIcons.badgeCheck;
    } else if (status == 'awaiting_confirmation' || status == 'partially_completed') {
      badgeColor = const Color(0xFF4338CA);
      badgeBg = const Color(0xFFEEF2FF);
      statusTitle = 'Inspect & Approve Work 🔍';
      statusSubtitle = 'The technician marked this job as finished. Please inspect the work and approve that it is well done to unlock payment.';
      statusIcon = LucideIcons.clipboardCheck;
    } else if (status == 'in_progress') {
      badgeColor = const Color(0xFF1D4ED8);
      badgeBg = const Color(0xFFEFF6FF);
      statusTitle = 'Work in Progress ⚡';
      statusSubtitle = req.assistantName != null && req.assistantName!.isNotEmpty
          ? 'Field Assistant ${req.assistantName} is actively working on your request.'
          : 'Specialist is actively working on your request.';
      statusIcon = LucideIcons.wrench;
    } else if (status == 'assigned' || status == 'accepted') {
      badgeColor = AppTheme.primary;
      badgeBg = AppTheme.primary.withValues(alpha: 0.1);
      statusTitle = req.assistantName != null && req.assistantName!.isNotEmpty
          ? 'Field Assistant Dispatched 👷'
          : 'HOD Accepted Request 👷';
      statusSubtitle = req.assistantName != null && req.assistantName!.isNotEmpty
          ? '${req.assistantName} has been dispatched by your Department HOD to handle your request.'
          : 'Your Department HOD accepted your request and is dispatching the nearest technician.';
      statusIcon = LucideIcons.userCheck;
    } else if (status == 'cancelled') {
      badgeColor = AppTheme.error;
      badgeBg = const Color(0xFFFEF2F2);
      statusTitle = 'Request Cancelled';
      statusSubtitle = 'This service request was closed.';
      statusIcon = LucideIcons.xCircle;
    } else {
      badgeColor = const Color(0xFFD97706);
      badgeBg = const Color(0xFFFFFBEB);
      statusTitle = req.hodName != null && req.hodName!.isNotEmpty
          ? 'Routed to ${req.clientState ?? ''} HOD 🛡️'
          : 'Awaiting Department HOD ⏳';
      statusSubtitle = req.hodName != null && req.hodName!.isNotEmpty
          ? 'Sent directly to ${req.hodName} (${req.serviceType} HOD) to dispatch the nearest assistant.'
          : 'Routed to the ${req.serviceType} Department for ${req.clientState ?? 'your location'}.';
      statusIcon = LucideIcons.shieldCheck;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: badgeBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: badgeColor.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(statusIcon, color: badgeColor, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statusTitle,
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: badgeColor),
                ),
                const SizedBox(height: 4),
                Text(
                  statusSubtitle,
                  style: TextStyle(fontSize: 12.5, color: badgeColor.withValues(alpha: 0.9), height: 1.3),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: req.displayRequestCode));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Request ID #${req.displayRequestCode} copied!')),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.shieldCheck, size: 13, color: badgeColor),
                        const SizedBox(width: 5),
                        Text(
                          'Request ID: #${req.displayRequestCode}',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: badgeColor,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(width: 5),
                        Icon(LucideIcons.copy, size: 11, color: badgeColor),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // PROGRESS STEPPER
  // -------------------------------------------------------------
  Widget _buildProgressStepper(ServiceRequestModel req, String status) {
    int currentStep = 1;
    if (status == 'assigned' || status == 'accepted') currentStep = 2;
    if (status == 'in_progress') currentStep = 3;
    if (status == 'awaiting_confirmation' || status == 'partially_completed') currentStep = 4;
    if (req.isClientApproved) currentStep = 4;
    if (req.paymentStatus == 'released' || req.paymentStatus == 'escrow_held') currentStep = 5;

    final steps = [
      {'title': 'Routed to HOD', 'icon': LucideIcons.shield},
      {'title': 'Assistant Sent', 'icon': LucideIcons.userCheck},
      {'title': 'In Progress', 'icon': LucideIcons.playCircle},
      {'title': 'Client Approved', 'icon': LucideIcons.checkCheck},
      {'title': 'Paid', 'icon': LucideIcons.shieldCheck},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Service Progress', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(steps.length, (i) {
              final stepIndex = i + 1;
              final isPassed = stepIndex <= currentStep;
              final isCurrent = stepIndex == currentStep;
              final color = isPassed ? AppTheme.primary : Colors.grey[300]!;

              return Expanded(
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        if (i < steps.length - 1)
                          Positioned(
                            left: 20,
                            right: -20,
                            top: 14,
                            child: Container(
                              height: 3,
                              color: stepIndex < currentStep ? AppTheme.primary : Colors.grey[200],
                            ),
                          ),
                        Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: isPassed ? AppTheme.primary : Colors.grey[100],
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isCurrent ? AppTheme.primary : color,
                              width: isCurrent ? 2.5 : 1.5,
                            ),
                          ),
                          child: Icon(
                            steps[i]['icon'] as IconData,
                            size: 14,
                            color: isPassed ? Colors.white : Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      steps[i]['title'] as String,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: isPassed ? FontWeight.bold : FontWeight.normal,
                        color: isPassed ? AppTheme.textPrimary : AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // ASSIGNED HOD & FIELD ASSISTANT CARD
  // -------------------------------------------------------------
  Widget _buildProviderCard(BuildContext context, ServiceRequestModel req) {
    if (_isLoadingProvider) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: const Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              SizedBox(width: 12),
              Text('Loading department details...', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
            ],
          ),
        ),
      );
    }

    final provider = _providerProfile;
    final providerName = req.hodName ?? provider?.fullName ?? 'Department HOD';
    final rating = provider?.rating ?? 4.9;
    final reviewCount = provider?.reviewCount ?? 12;
    final phone = req.hodPhone ?? provider?.phone;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                req.clientState != null && req.clientState!.isNotEmpty
                    ? '${req.clientState} Department HOD'
                    : 'Department Head (HOD)',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Row(
                  children: [
                    Icon(LucideIcons.shieldCheck, size: 13, color: Color(0xFF4338CA)),
                    SizedBox(width: 4),
                    Text(
                      'Verified HOD',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF4338CA)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              ClipOval(
                child: SizedBox(
                  width: 52,
                  height: 52,
                  child: SafeImageHelper.buildImage(
                    provider?.passportUrl,
                    width: 52,
                    height: 52,
                    fit: BoxFit.cover,
                    errorWidget: Container(
                      width: 52,
                      height: 52,
                      color: AppTheme.primary.withValues(alpha: 0.1),
                      alignment: Alignment.center,
                      child: Text(
                        providerName.isNotEmpty ? providerName[0].toUpperCase() : 'H',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary, fontSize: 20),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      providerName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${req.serviceType} Department${req.clientState != null ? ' • ${req.clientState}' : ''}',
                      style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12.5),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(LucideIcons.star, size: 14, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 4),
                        Text(
                          '$rating ($reviewCount reviews)',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.textPrimary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Dispatched Field Assistant Banner (if HOD assigned an assistant)
          if (req.assistantName != null && req.assistantName!.isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: const BoxDecoration(
                      color: Color(0xFF059669),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.users, size: 16, color: Colors.white),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'DISPATCHED FIELD ASSISTANT',
                          style: TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF047857),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${req.assistantName}${req.assistantArea != null && req.assistantArea!.isNotEmpty ? ' • ${req.assistantArea}' : ''}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF065F46)),
                        ),
                        if (req.assistantPhone != null && req.assistantPhone!.isNotEmpty)
                          Text(
                            req.assistantPhone!,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF047857)),
                          ),
                      ],
                    ),
                  ),
                  if (req.assistantPhone != null && req.assistantPhone!.isNotEmpty)
                    IconButton(
                      onPressed: () => _launchPhoneCall(context, req.assistantPhone!, req.assistantName ?? 'Field Assistant'),
                      icon: const Icon(LucideIcons.phoneCall, size: 18, color: Color(0xFF059669)),
                      tooltip: 'Call Field Assistant',
                    ),
                ],
              ),
            ),
          ],

          // Doorstep Security Verification Box
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(LucideIcons.shieldCheck, size: 18, color: Color(0xFFB45309)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'DOORSTEP SECURITY • #${req.displayRequestCode}',
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF92400E),
                          letterSpacing: 0.4,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'For your safety, when the technician arrives at your gate or door, ask them to quote Request ID #${req.displayRequestCode}${req.assistantName != null && req.assistantName!.isNotEmpty ? " and confirm their name (${req.assistantName})" : ""} before granting entry.',
                        style: const TextStyle(fontSize: 11.5, color: Color(0xFF78350F), height: 1.35),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: AppTheme.border),
          const SizedBox(height: 10),
          if (req.status.toLowerCase() == 'pending' || req.status.toLowerCase() == 'open')
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.lock, size: 14, color: AppTheme.textSecondary),
                  SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      'Chat & Call unlock once the Department HOD accepts this request',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            )
          else
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChatScreen(
                            title: providerName,
                            subtitle: req.serviceType,
                            jobId: req.id,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(LucideIcons.messageSquare, size: 16),
                    label: const Text('Chat with HOD'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      side: const BorderSide(color: AppTheme.border),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
                if ((req.providerId != null && req.providerId!.isNotEmpty) || (phone != null && phone.isNotEmpty)) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        if (req.providerId != null && req.providerId!.isNotEmpty) {
                          final authProvider = Provider.of<AuthProvider>(context, listen: false);
                          final callProvider = Provider.of<CallProvider>(context, listen: false);
                          final uid = authProvider.user?.uid ?? '';
                          if (uid.isNotEmpty) {
                            callProvider.listenForIncomingCalls(
                              uid,
                              authProvider.userProfile?.fullName ??
                                  authProvider.user?.displayName ??
                                  'Wheelhomes User',
                            );
                            callProvider.startCall(
                              calleeId: req.providerId!,
                              calleeName: providerName,
                              jobId: req.id,
                              requestCode: req.displayRequestCode,
                            );
                            return;
                          }
                        }
                        if (phone != null && phone.isNotEmpty) {
                          _launchPhoneCall(context, phone, providerName);
                        }
                      },
                      icon: const Icon(LucideIcons.phone, size: 16),
                      label: const Text('Call HOD'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
        ],
      ),
    );
  }

  Future<void> _launchPhoneCall(BuildContext context, String rawPhone, String label) async {
    final cleanPhone = rawPhone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (cleanPhone.isEmpty) return;

    final dialedNatively = await ChatSoundHelper.dialPhoneNumber(cleanPhone);
    if (dialedNatively) return;

    try {
      final uri = Uri.parse('tel:$cleanPhone');
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (launched) return;
    } catch (_) {}

    if (context.mounted) {
      Clipboard.setData(ClipboardData(text: cleanPhone));
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Phone number for $label ($cleanPhone) copied to clipboard 📞'),
          backgroundColor: AppTheme.primary,
        ),
      );
    }
  }

  // -------------------------------------------------------------
  // ESCROW & PAYMENT CARD (STRICTLY GATED BY CLIENT APPROVAL)
  // -------------------------------------------------------------
  Widget _buildEscrowCard(BuildContext context, ServiceRequestModel req) {
    final isUnpaid = req.paymentStatus == 'unpaid';
    final isHeld = req.paymentStatus == 'escrow_held';
    final isReleased = req.paymentStatus == 'released';
    final status = req.status.toLowerCase();
    final isAwaitingApproval = status == 'awaiting_confirmation' || status == 'partially_completed';
    final isApproved = req.isClientApproved;
    final canRelease = isHeld && isApproved;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isAwaitingApproval ? const Color(0xFF6366F1) : AppTheme.border,
          width: isAwaitingApproval ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Icon(
                      isApproved ? LucideIcons.shieldCheck : LucideIcons.lock,
                      size: 18,
                      color: isApproved ? const Color(0xFF047857) : const Color(0xFF4338CA),
                    ),
                    const SizedBox(width: 6),
                    const Flexible(
                      child: Text(
                        'Client Approval & Payment',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: isReleased || isHeld
                      ? const Color(0xFFECFDF5)
                      : isApproved
                          ? const Color(0xFFFEF3C7)
                          : const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isReleased
                      ? 'PAID'
                      : isHeld
                          ? 'ESCROW HELD'
                          : isApproved
                              ? 'READY TO PAY'
                              : 'LOCKED 🔒',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    color: isReleased || isHeld
                        ? const Color(0xFF047857)
                        : isApproved
                            ? const Color(0xFFB45309)
                            : const Color(0xFF4338CA),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (req.initialBudget != null && req.price != null && req.initialBudget != req.price) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Initial Client Estimate:', style: TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                Text(
                  '₦${req.initialBudget!.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
          ],
          if (req.price != null) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  req.finalAgreedPrice != null ? 'Final Agreed Bill:' : 'Estimated Service Fee:',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                Text(
                  '₦${req.price!.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primary),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
          if (req.completionSummary != null && req.completionSummary!.trim().isNotEmpty) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'TECHNICIAN WORK SUMMARY',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF4338CA),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    req.completionSummary!,
                    style: const TextStyle(fontSize: 12.5, color: AppTheme.textPrimary, height: 1.35),
                  ),
                ],
              ),
            ),
          ],

          // Stage-specific guidance message
          Text(
            isReleased || isHeld
                ? 'Your payment has been processed securely. Thank you for using Wheel of Comfort!'
                : isApproved
                    ? 'You have confirmed that this job is well done! You may now proceed to complete your payment below.'
                    : isAwaitingApproval
                        ? 'The technician has marked the work as finished. Please inspect the job first — payment will only unlock after you confirm the job is well done.'
                        : 'For your protection, payment is strictly disabled until the technician completes the work and you approve that the job is well done.',
            style: const TextStyle(fontSize: 12.5, color: AppTheme.textSecondary, height: 1.4),
          ),
          const SizedBox(height: 14),

          // 1. If technician marked done -> Show "Approve Job Is Well Done" + "Request Redo"
          if (isAwaitingApproval && !isApproved) ...[
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                onPressed: () => _handleApproveJobWellDone(context, req),
                icon: const Icon(LucideIcons.checkCheck, size: 16),
                label: const Text('Approve — Job Is Well Done ✅', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857)),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              height: 40,
              child: OutlinedButton.icon(
                onPressed: () => _handleRequestRedo(context, req),
                icon: const Icon(LucideIcons.rotateCcw, size: 15, color: AppTheme.error),
                label: const Text(
                  'Not Satisfied Yet — Ask Technician to Fix',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.error),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppTheme.error.withValues(alpha: 0.4)),
                ),
              ),
            ),
          ]
          // 2. Only when Client has Approved (`isApproved == true`) AND `isUnpaid` -> Unlock Payment!
          else if (isUnpaid && isApproved) ...[
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PaymentCheckoutScreen(request: req),
                    ),
                  );
                },
                icon: const Icon(LucideIcons.creditCard, size: 16),
                label: const Text('Proceed to Make Payment 💳', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
              ),
            ),
          ]
          // 3. Before work is done/approved -> Show disabled lock indicator
          else if (isUnpaid && !isApproved) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.lock, size: 15, color: AppTheme.textSecondary),
                  SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'Payment unlocks after you approve the completed work',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
          ] else if (canRelease) ...[
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                onPressed: () => _handleReleaseEscrow(context, req),
                icon: const Icon(LucideIcons.checkCheck, size: 16),
                label: const Text('Release Payment to Specialist ✅', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _handleApproveJobWellDone(BuildContext context, ServiceRequestModel req) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Approve Job & Final Bill? ✅'),
        content: Text(
          'Have you inspected "${req.serviceType}" and confirmed that:\n\n'
          '1. The work is completed to your satisfaction\n'
          '2. You agree to the final bill of ₦${(req.price ?? 0).toStringAsFixed(0)}\n\n'
          'Approving this will unlock payment so you can settle the service fee.',
          style: const TextStyle(fontSize: 13, height: 1.45),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Not Yet')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final reqProvider = Provider.of<RequestProvider>(context, listen: false);
              final success = await reqProvider.updateJobStatus(
                jobId: req.id,
                status: 'fully_completed',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success
                        ? 'Job approved as well done! Payment is now unlocked. 🎉'
                        : 'Could not approve job. Please try again.'),
                    backgroundColor: success ? const Color(0xFF047857) : AppTheme.error,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857)),
            child: const Text('Yes, Job Is Well Done', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _handleRequestRedo(BuildContext context, ServiceRequestModel req) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Work Not Completed Yet? ⚠️'),
        content: const Text(
          'This will return the request status to "In Progress" and notify your Department HOD & technician that further work is needed before you can approve.',
          style: TextStyle(fontSize: 13, height: 1.45),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final reqProvider = Provider.of<RequestProvider>(context, listen: false);
              await reqProvider.updateJobStatus(
                jobId: req.id,
                status: 'in_progress',
                note: 'Client requested additional attention before approving completion.',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Returned to In Progress. Technician notified.'),
                    backgroundColor: AppTheme.primary,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Return to In Progress', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // JOB INFO CARD
  // -------------------------------------------------------------
  Widget _buildJobInfoCard(ServiceRequestModel req) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Request Overview', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          _infoRow(LucideIcons.wrench, 'Service Type', req.serviceType),
          const SizedBox(height: 10),
          if (req.clientState != null && req.clientState!.isNotEmpty) ...[
            _infoRow(LucideIcons.shield, 'Routed State', '${req.clientState} State'),
            const SizedBox(height: 10),
          ],
          if (req.location['address'] != null && '${req.location['address']}'.isNotEmpty) ...[
            _infoRow(LucideIcons.mapPin, 'Service Address', '${req.location['address']}'),
            const SizedBox(height: 10),
          ],
          _infoRow(LucideIcons.calendar, 'Requested On', req.createdAt.split('T').first),
          const SizedBox(height: 14),
          const Divider(height: 1, color: AppTheme.border),
          const SizedBox(height: 12),
          const Text('Description of Issue', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
          const SizedBox(height: 6),
          Text(
            req.description,
            style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String title, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppTheme.primary),
        const SizedBox(width: 8),
        Text('$title: ', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
        Expanded(
          child: Text(value, style: const TextStyle(fontSize: 12.5, color: AppTheme.textSecondary)),
        ),
      ],
    );
  }

  // -------------------------------------------------------------
  // PHOTOS CARD
  // -------------------------------------------------------------
  Widget _buildPhotosCard(BuildContext context, ServiceRequestModel req) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Attached Photos (${req.images.length})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          SizedBox(
            height: 90,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: req.images.length,
              itemBuilder: (ctx, index) {
                final url = req.images[index];
                return GestureDetector(
                  onTap: () => _viewFullPhoto(context, url),
                  child: Container(
                    width: 90,
                    height: 90,
                    margin: const EdgeInsets.only(right: 10),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        url,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: Colors.grey[200],
                          child: const Icon(LucideIcons.image, color: Colors.grey),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _viewFullPhoto(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(url, fit: BoxFit.contain),
            ),
            IconButton(
              icon: const Icon(LucideIcons.x, color: Colors.white, size: 24),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // RATING & REVIEW SECTION
  // -------------------------------------------------------------
  Widget _buildReviewSection(BuildContext context, ServiceRequestModel req) {
    final hasRated = req.clientRating != null && req.clientRating! > 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Specialist Rating & Feedback', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              if (!hasRated)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text('Pending Review', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (hasRated) ...[
            Row(
              children: [
                ...List.generate(5, (starIdx) {
                  return Icon(
                    LucideIcons.star,
                    color: starIdx < req.clientRating!.round() ? const Color(0xFFF59E0B) : Colors.grey[300],
                    size: 18,
                  );
                }),
                const SizedBox(width: 8),
                Text(
                  '${req.clientRating!.toStringAsFixed(1)} / 5.0',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
            if (req.clientReview != null && req.clientReview!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                '“${req.clientReview}”',
                style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: AppTheme.textSecondary),
              ),
            ],
          ] else ...[
            const Text(
              'How was your experience with the specialist? Your rating helps maintain quality standards on Wheelhomes.',
              style: TextStyle(fontSize: 12.5, color: AppTheme.textSecondary, height: 1.35),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton.icon(
                onPressed: () => _showRatingModal(context, req),
                icon: const Icon(LucideIcons.star, size: 16, color: Color(0xFFF59E0B)),
                label: const Text('Rate Your Specialist ⭐', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFFDE68A)),
                  backgroundColor: const Color(0xFFFFFBEB),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _showRatingModal(BuildContext context, ServiceRequestModel req) {
    double selectedRating = 5.0;
    final reviewController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Rate Your Specialist 🌟', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(LucideIcons.x, size: 20), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Help other residents discover quality artisans for ${req.serviceType}.',
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 20),
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(5, (index) {
                    final starVal = index + 1.0;
                    return GestureDetector(
                      onTap: () => setModalState(() => selectedRating = starVal),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4.0),
                        child: Icon(
                          LucideIcons.star,
                          size: 36,
                          color: starVal <= selectedRating ? const Color(0xFFF59E0B) : Colors.grey[300],
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  selectedRating == 5.0
                      ? 'Excellent (5.0 / 5.0)'
                      : selectedRating >= 4.0
                          ? 'Very Good (${selectedRating.toStringAsFixed(1)} / 5.0)'
                          : selectedRating >= 3.0
                              ? 'Good (${selectedRating.toStringAsFixed(1)} / 5.0)'
                              : 'Needs Improvement (${selectedRating.toStringAsFixed(1)} / 5.0)',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary),
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: reviewController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Feedback / Comments (Optional)',
                  hintText: 'Punctuality, quality of work, cleanliness, professionalism...',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final reqProvider = Provider.of<RequestProvider>(context, listen: false);
                    final success = await reqProvider.submitServiceReview(
                      jobId: req.id,
                      providerId: req.providerId ?? '',
                      rating: selectedRating,
                      review: reviewController.text.trim(),
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(success ? 'Review submitted! Thank you for your feedback. 🎉' : 'Failed to save review.'),
                          backgroundColor: success ? AppTheme.accent : AppTheme.error,
                        ),
                      );
                    }
                  },
                  child: const Text('Submit Review', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // RELEASE ESCROW ACTION
  // -------------------------------------------------------------
  void _handleReleaseEscrow(BuildContext context, ServiceRequestModel req) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Confirm Escrow Release? 🔒'),
        content: Text(
          'Confirm that the service (${req.serviceType}) was delivered to your satisfaction. Once approved, the funds in escrow are released immediately to the specialist.',
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final paymentProvider = Provider.of<PaymentProvider>(context, listen: false);
              final success = await paymentProvider.releaseEscrowPayment(jobId: req.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success
                        ? 'Payment released to specialist successfully! 🎉'
                        : 'Failed to release payment. Please try again.'),
                    backgroundColor: success ? const Color(0xFF047857) : AppTheme.error,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857)),
            child: const Text('Confirm & Release', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // CANCEL REQUEST ACTION
  // -------------------------------------------------------------
  void _confirmCancel(BuildContext context, ServiceRequestModel req) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel Service Request?'),
        content: const Text(
          'Are you sure you want to cancel this request? It will be closed immediately.',
          style: TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Keep Active')),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final reqProvider = Provider.of<RequestProvider>(context, listen: false);
              final success = await reqProvider.cancelRequest(jobId: req.id);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? 'Request cancelled successfully.' : 'Failed to cancel request.'),
                    backgroundColor: success ? AppTheme.primary : AppTheme.error,
                  ),
                );
                Navigator.pop(context); // Go back to request list
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Cancel Request', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
