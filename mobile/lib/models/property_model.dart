class PropertyModel {
  final String id;
  final String title;
  final String price;
  final String address;
  final int beds;
  final int baths;
  final int sqft;
  final String type;
  final String status;
  final String image;
  final String agentName;
  final String? agentImage;

  PropertyModel({
    required this.id,
    required this.title,
    required this.price,
    required this.address,
    required this.beds,
    required this.baths,
    required this.sqft,
    required this.type,
    required this.status,
    required this.image,
    required this.agentName,
    this.agentImage,
  });

  factory PropertyModel.fromMap(Map<String, dynamic> map, String docId) {
    return PropertyModel(
      id: docId,
      title: map['title'] ?? '',
      price: map['price'] ?? '\$0',
      address: map['address'] ?? '',
      beds: (map['beds'] ?? 0) is int ? map['beds'] : int.tryParse('${map['beds']}') ?? 0,
      baths: (map['baths'] ?? 0) is int ? map['baths'] : int.tryParse('${map['baths']}') ?? 0,
      sqft: (map['sqft'] ?? 0) is int ? map['sqft'] : int.tryParse('${map['sqft']}') ?? 0,
      type: map['type'] ?? 'Apartment',
      status: map['status'] ?? 'For Rent',
      image: map['image'] ?? 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      agentName: map['agentName'] ?? 'Wheelhomes Agent',
      agentImage: map['agentImage'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'price': price,
      'address': address,
      'beds': beds,
      'baths': baths,
      'sqft': sqft,
      'type': type,
      'status': status,
      'image': image,
      'agentName': agentName,
      'agentImage': agentImage,
    };
  }
}
