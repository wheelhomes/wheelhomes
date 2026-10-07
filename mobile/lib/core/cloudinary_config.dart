class CloudinaryConfig {
  /// Cloudinary Cloud Name
  /// Replace with your free Cloudinary Cloud Name (from Cloudinary dashboard)
  static const String cloudName = 'xppp85cc';

  /// Cloudinary Unsigned Upload Preset
  /// Created in Cloudinary Console: Settings -> Upload -> Add upload preset -> Signing Mode: Unsigned
  static const String uploadPreset = 'wheelhomes_preset';

  /// API Endpoint for Direct Uploads
  static String get uploadUrl =>
      'https://api.cloudinary.com/v1_1/$cloudName/image/upload';
}
