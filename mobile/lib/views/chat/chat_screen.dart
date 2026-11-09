import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/chat_sound.dart';
import '../../core/theme.dart';
import '../../models/chat_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/call_provider.dart';
import '../../providers/chat_provider.dart';

class ChatScreen extends StatefulWidget {
  final String title;
  final String? subtitle;
  final String? jobId;
  final String? chatId;
  final String? recipientName;

  const ChatScreen({
    super.key,
    required this.title,
    this.subtitle,
    this.jobId,
    this.chatId,
    this.recipientName,
  }) : assert(jobId != null || chatId != null, 'Either jobId or chatId must be provided');

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  StreamSubscription<Map<String, dynamic>>? _jobMetaSub;
  Map<String, dynamic> _jobMeta = {};
  final Set<String> _markedReadIds = {};
  bool _canSend = false;
  bool _showEmojiPicker = false;
  bool _soundMuted = false;
  int _selectedCategoryIndex = 0;
  int _prevMessageCount = 0;
  bool _initialSnapshotLoaded = false;

  static const List<String> _quickChips = [
    '🚗 On my way',
    '📍 I\'m at your gate',
    '🪪 Ready with #WOC ID',
    '🛠️ Inspecting the unit',
    '🧾 Final bill submitted',
    '✅ Work completed',
  ];

  static const List<Map<String, dynamic>> _emojiCategories = [
    {
      'icon': '👍',
      'label': 'Quick & Status',
      'emojis': [
        '👍', '🙏', '👋', '🤝', '✅', '🆗', '😊', '😄',
        '😂', '🫡', '🙌', '👏', '🔥', '💯', '⭐', '❤️',
        '🎉', '🤔', '😅', '👀', '⏳', '🚀', '✨', '💪',
      ],
    },
    {
      'icon': '🛠️',
      'label': 'Repairs & Trades',
      'emojis': [
        '🛠️', '🔧', '🔨', '🪛', '🪚', '🔩', '⚙️', '🧰',
        '🪜', '🧱', '🪠', '🚿', '🚰', '🚽', '🛁', '🪣',
        '🧹', '🧽', '🧼', '🧺', '🎨', '🖌️', '🦺', '👷',
      ],
    },
    {
      'icon': '⚡',
      'label': 'AC, Solar & Power',
      'emojis': [
        '❄️', '🌡️', '💨', '🧊', '☀️', '🔋', '🔌', '⚡',
        '💡', '🔦', '⛽', '🔥', '📺', '🖥️', '📡', '🔔',
        '🚨', '🧯', '🌀', '🌬️', '🕯️', '📻', '🛰️', '🎛️',
      ],
    },
    {
      'icon': '🏠',
      'label': 'Home & Property',
      'emojis': [
        '🏠', '🏡', '🏢', '🏘️', '🏗️', '🚪', '🪟', '🛋️',
        '🛏️', '🪑', '🔑', '🔒', '🔓', '🛡️', '📦', '🪴',
      ],
    },
    {
      'icon': '🚗',
      'label': 'Dispatch & Billing',
      'emojis': [
        '🚗', '🚐', '🚚', '🛵', '📍', '🗺️', '⏰', '⏱️',
        '📅', '📞', '💬', '📸', '🪪', '🧾', '💰', '💳',
        '📋', '✔️', '💵', '📱', '📹', '🧭', '🚕', '🛡️',
      ],
    },
  ];

  @override
  void initState() {
    super.initState();
    _textController.addListener(() {
      final canSend = _textController.text.trim().isNotEmpty;
      if (canSend != _canSend) {
        setState(() => _canSend = canSend);
      }
    });
    if (widget.jobId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final chatProvider = Provider.of<ChatProvider>(context, listen: false);
        final authProvider = Provider.of<AuthProvider>(context, listen: false);
        final uid = authProvider.user?.uid ?? '';
        final role = authProvider.userProfile?.role ?? 'user';

        _jobMetaSub = chatProvider.service
            .streamJobMetadata(widget.jobId!)
            .listen((meta) {
          if (mounted) {
            setState(() => _jobMeta = meta);
          }
          final lastSender = (meta['lastMessageSenderId'] ?? '').toString();
          final lastStatus = (meta['lastMessageStatus'] ?? '').toString();
          if (uid.isNotEmpty &&
              lastSender.isNotEmpty &&
              lastSender != uid &&
              lastStatus != 'read') {
            chatProvider.service.markJobMessagesAsRead(
              jobId: widget.jobId!,
              currentUserId: uid,
              role: role,
            );
          }
        }, onError: (_) {});
      });
    }
  }

  @override
  void reassemble() {
    super.reassemble();
    _markedReadIds.clear();
  }

  @override
  void dispose() {
    _jobMetaSub?.cancel();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  int _toMillis(dynamic ts) {
    if (ts == null) return 0;
    if (ts is Timestamp) return ts.millisecondsSinceEpoch;
    if (ts is DateTime) return ts.millisecondsSinceEpoch;
    if (ts is String) {
      return DateTime.tryParse(ts)?.millisecondsSinceEpoch ?? 0;
    }
    return 0;
  }

  String _resolveOutgoingTickStatus(
    ChatMessage msg,
    String currentRole,
    List<ChatMessage> allMessages,
    int index,
  ) {
    final isProvider =
        currentRole == 'provider' || currentRole == 'service_provider';
    final otherReadMs = _toMillis(
      isProvider ? _jobMeta['clientLastReadAt'] : _jobMeta['providerLastReadAt'],
    );
    final otherDeliveredMs = _toMillis(
      isProvider
          ? _jobMeta['clientLastDeliveredAt']
          : _jobMeta['providerLastDeliveredAt'],
    );
    final msgMs = msg.createdAt.millisecondsSinceEpoch;

    final hasSubsequentReplyFromOther = allMessages
        .skip(index + 1)
        .any((m) => m.senderId != msg.senderId);

    final isRead = msg.read ||
        msg.status == 'read' ||
        hasSubsequentReplyFromOther ||
        (otherReadMs > 0 && msgMs <= otherReadMs + 5000) ||
        (_jobMeta['lastMessageSenderId'] == msg.senderId &&
            _jobMeta['lastMessageStatus'] == 'read');

    if (isRead) return 'read';

    final isDelivered = msg.delivered ||
        msg.status == 'delivered' ||
        (otherDeliveredMs > 0 && msgMs <= otherDeliveredMs + 5000) ||
        (_jobMeta['lastMessageSenderId'] == msg.senderId &&
            _jobMeta['lastMessageStatus'] == 'delivered');

    if (isDelivered) return 'delivered';
    return 'sent';
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 80,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;
    if (user == null) return;

    final profile = authProvider.userProfile;
    final senderName = profile?.fullName ?? user.displayName ?? 'User';
    final role = profile?.role ?? 'user';

    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    _textController.clear();
    if (_showEmojiPicker) {
      setState(() => _showEmojiPicker = false);
    }
    if (!_soundMuted) {
      ChatSoundHelper.playOutgoingPop();
    }

    bool success = false;
    if (widget.jobId != null) {
      success = await chatProvider.sendJobMessage(
        jobId: widget.jobId!,
        text: text,
        senderId: user.uid,
        senderName: senderName,
        role: role,
      );
    } else if (widget.chatId != null) {
      success = await chatProvider.sendDirectMessage(
        chatId: widget.chatId!,
        text: text,
        senderId: user.uid,
        senderName: senderName,
        role: role,
      );
    }

    if (success) {
      Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final currentUserId = authProvider.user?.uid ?? '';
    final chatProvider = Provider.of<ChatProvider>(context);

    final Stream<List<ChatMessage>> messageStream = widget.jobId != null
        ? chatProvider.streamJobMessages(widget.jobId!)
        : chatProvider.streamDirectMessages(widget.chatId!);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
              child: Text(
                widget.title.isNotEmpty ? widget.title[0].toUpperCase() : 'C',
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (widget.subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      widget.subtitle!,
                      style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        actions: [
          if (widget.jobId != null)
            IconButton(
              tooltip: 'Online Voice Call',
              icon: const Icon(
                LucideIcons.phone,
                size: 20,
                color: AppTheme.primary,
              ),
              onPressed: () {
                final clientId = (_jobMeta['clientId'] ?? _jobMeta['userId'] ?? '').toString();
                final providerId = (_jobMeta['providerId'] ?? _jobMeta['hodId'] ?? '').toString();
                final otherId = clientId == currentUserId ? providerId : clientId;
                if (otherId.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Could not find recipient for this call.')),
                  );
                  return;
                }
                final reqCode = (_jobMeta['requestCode'] ??
                        _jobMeta['trackingId'] ??
                        widget.jobId!.substring(0, 6).toUpperCase())
                    .toString();
                final authProfile = authProvider.userProfile;
                final callProvider = Provider.of<CallProvider>(context, listen: false);
                callProvider.listenForIncomingCalls(
                  currentUserId,
                  authProfile?.fullName ?? authProvider.user?.displayName ?? 'Wheelhomes User',
                );
                callProvider.startCall(
                  calleeId: otherId,
                  calleeName: widget.recipientName ?? widget.title,
                  jobId: widget.jobId,
                  requestCode: reqCode,
                );
              },
            ),
          IconButton(
            tooltip: _soundMuted ? 'Unmute Chat Tune' : 'Mute Chat Tune',
            icon: Icon(
              _soundMuted ? LucideIcons.volumeX : LucideIcons.volume2,
              size: 20,
              color: _soundMuted ? AppTheme.textSecondary : AppTheme.primary,
            ),
            onPressed: () {
              setState(() {
                _soundMuted = !_soundMuted;
                ChatSoundHelper.isMuted = _soundMuted;
              });
              if (!_soundMuted) {
                ChatSoundHelper.playIncomingTune(force: true);
              }
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Message stream
            Expanded(
              child: StreamBuilder<List<ChatMessage>>(
                stream: messageStream,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final messages = snapshot.data ?? [];
                  final currentRole = authProvider.userProfile?.role ?? 'user';

                  if (widget.jobId != null && currentUserId.isNotEmpty) {
                    final newIncoming = messages
                        .where((m) =>
                            m.senderId != currentUserId &&
                            !_markedReadIds.contains(m.id))
                        .toList();
                    if (newIncoming.isNotEmpty) {
                      for (final m in newIncoming) {
                        _markedReadIds.add(m.id);
                      }
                      chatProvider.service.markJobMessagesAsRead(
                        jobId: widget.jobId!,
                        currentUserId: currentUserId,
                        role: currentRole,
                      );
                    }
                  }

                  if (_initialSnapshotLoaded && messages.length > _prevMessageCount) {
                    final newest = messages.last;
                    if (newest.senderId != currentUserId && !_soundMuted) {
                      ChatSoundHelper.playIncomingTune();
                    }
                  }
                  _initialSnapshotLoaded = true;
                  _prevMessageCount = messages.length;

                  if (messages.isEmpty) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(LucideIcons.messageSquare, size: 36, color: AppTheme.primary),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Start the Conversation',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Ask questions, clarify details, or coordinate arrival times.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

                  return ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[index];
                      final isMe = msg.senderId == currentUserId;
                      final tickStatus = isMe
                          ? _resolveOutgoingTickStatus(
                              msg,
                              currentRole,
                              messages,
                              index,
                            )
                          : 'sent';

                      return _MessageBubble(
                        message: msg,
                        isMe: isMe,
                        tickStatus: tickStatus,
                      );
                    },
                  );
                },
              ),
            ),

            // WhatsApp-Style Bottom Input Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFFF0F2F5),
                border: Border(top: BorderSide(color: AppTheme.border, width: 1)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            onPressed: () {
                              FocusScope.of(context).unfocus();
                              setState(() => _showEmojiPicker = !_showEmojiPicker);
                            },
                            icon: Icon(
                              LucideIcons.smile,
                              size: 21,
                              color: _showEmojiPicker ? AppTheme.primary : AppTheme.textSecondary,
                            ),
                            tooltip: 'Emojis & Service Icons',
                          ),
                          Expanded(
                            child: TextField(
                              controller: _textController,
                              textCapitalization: TextCapitalization.sentences,
                              maxLines: 4,
                              minLines: 1,
                              onTap: () {
                                if (_showEmojiPicker) {
                                  setState(() => _showEmojiPicker = false);
                                }
                              },
                              decoration: const InputDecoration(
                                hintText: 'Type a message',
                                hintStyle: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
                                contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                                border: InputBorder.none,
                              ),
                              onSubmitted: (_) => _sendMessage(),
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: BoxDecoration(
                      color: _canSend ? AppTheme.primary : Colors.grey[350],
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(LucideIcons.send, size: 18, color: Colors.white),
                      onPressed: _canSend ? _sendMessage : null,
                    ),
                  ),
                ],
              ),
            ),

            // WhatsApp-Style Categorized Service Emoji Drawer
            if (_showEmojiPicker)
              Container(
                color: const Color(0xFFF0F2F5),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // 1-Tap Quick Service Status Chips
                    Container(
                      height: 40,
                      color: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        itemCount: _quickChips.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 6),
                        itemBuilder: (context, idx) {
                          final chip = _quickChips[idx];
                          return InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () {
                              final current = _textController.text;
                              _textController.text = '$current$chip ';
                              _textController.selection = TextSelection.fromPosition(
                                TextPosition(offset: _textController.text.length),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFF7ED),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFFED7AA)),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                chip,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF9A3412),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    // Category Tab Bar + Backspace
                    Container(
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        border: Border(
                          top: BorderSide(color: AppTheme.border, width: 0.5),
                          bottom: BorderSide(color: AppTheme.border, width: 0.8),
                        ),
                      ),
                      child: Row(
                        children: [
                          ...List.generate(_emojiCategories.length, (i) {
                            final cat = _emojiCategories[i];
                            final isSelected = _selectedCategoryIndex == i;
                            return Expanded(
                              child: InkWell(
                                onTap: () => setState(() => _selectedCategoryIndex = i),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppTheme.primary.withValues(alpha: 0.08)
                                        : Colors.transparent,
                                    border: Border(
                                      bottom: BorderSide(
                                        color: isSelected ? AppTheme.primary : Colors.transparent,
                                        width: 2.5,
                                      ),
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    cat['icon'] as String,
                                    style: const TextStyle(fontSize: 17),
                                  ),
                                ),
                              ),
                            );
                          }),
                          IconButton(
                            onPressed: () {
                              final current = _textController.text;
                              if (current.isEmpty) return;
                              final chars = current.characters.toList();
                              if (chars.isNotEmpty) {
                                chars.removeLast();
                                _textController.text = chars.join();
                                _textController.selection = TextSelection.fromPosition(
                                  TextPosition(offset: _textController.text.length),
                                );
                              }
                            },
                            icon: const Icon(LucideIcons.delete, size: 18, color: AppTheme.textSecondary),
                            tooltip: 'Backspace',
                          ),
                        ],
                      ),
                    ),
                    // Category Title
                    Padding(
                      padding: const EdgeInsets.fromLTRB(12, 6, 12, 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            (_emojiCategories[_selectedCategoryIndex]['label'] as String).toUpperCase(),
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textSecondary,
                              letterSpacing: 0.6,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => setState(() => _showEmojiPicker = false),
                            child: const Text(
                              'Hide',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Emoji Grid
                    SizedBox(
                      height: 165,
                      child: GridView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        itemCount: (_emojiCategories[_selectedCategoryIndex]['emojis'] as List<String>).length,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 8,
                          mainAxisSpacing: 4,
                          crossAxisSpacing: 4,
                        ),
                        itemBuilder: (context, idx) {
                          final emoji = (_emojiCategories[_selectedCategoryIndex]['emojis'] as List<String>)[idx];
                          return InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () {
                              final current = _textController.text;
                              _textController.text = '$current$emoji';
                              _textController.selection = TextSelection.fromPosition(
                                TextPosition(offset: _textController.text.length),
                              );
                            },
                            child: Center(
                              child: Text(emoji, style: const TextStyle(fontSize: 21)),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMe;
  final String tickStatus;

  const _MessageBubble({
    required this.message,
    required this.isMe,
    this.tickStatus = 'sent',
  });

  @override
  Widget build(BuildContext context) {
    final timeStr = DateFormat('h:mm a').format(message.createdAt);

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.76),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (!isMe) ...[
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message.senderName,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      message.role.toUpperCase(),
                      style: const TextStyle(color: AppTheme.primary, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
            ],
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMe ? AppTheme.primary : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 16),
                ),
                border: isMe ? null : Border.all(color: AppTheme.border),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message.text,
                    style: TextStyle(
                      color: isMe ? Colors.white : AppTheme.textPrimary,
                      fontSize: 14,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Align(
                    alignment: Alignment.bottomRight,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          timeStr,
                          style: TextStyle(
                            fontSize: 10,
                            color: isMe ? Colors.white70 : AppTheme.textSecondary,
                          ),
                        ),
                        if (isMe) ...[
                          const SizedBox(width: 4),
                          if (tickStatus == 'read')
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 5,
                                vertical: 1.5,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                LucideIcons.checkCheck,
                                size: 13.5,
                                color: Color(0xFF0066FF),
                              ),
                            )
                          else if (tickStatus == 'delivered')
                            const Icon(
                              LucideIcons.checkCheck,
                              size: 14.5,
                              color: Colors.white70,
                            )
                          else
                            const Icon(
                              LucideIcons.check,
                              size: 13.5,
                              color: Colors.white70,
                            ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
