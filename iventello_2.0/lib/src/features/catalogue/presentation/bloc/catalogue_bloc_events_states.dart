import 'package:equatable/equatable.dart';
import '../../domain/entities/product_entity.dart';

// ─── Events ───────────────────────────────────────────
abstract class CatalogueEvent extends Equatable {
  const CatalogueEvent();
  @override
  List<Object?> get props => [];
}

class LoadProductsEvent extends CatalogueEvent {
  final String shopId;
  const LoadProductsEvent(this.shopId);
  @override
  List<Object?> get props => [shopId];
}

class SearchProductsEvent extends CatalogueEvent {
  final String shopId;
  final String query;
  const SearchProductsEvent({required this.shopId, required this.query});
  @override
  List<Object?> get props => [shopId, query];
}

class FilterByCategoryEvent extends CatalogueEvent {
  final String? categoryId;
  const FilterByCategoryEvent(this.categoryId);
  @override
  List<Object?> get props => [categoryId];
}

class CreateProductEvent extends CatalogueEvent {
  final String shopId;
  final String name;
  final String? barcode;
  final String? sku;
  final int basePriceCents;
  final int sellingPriceCents;
  final double vatRate;
  final bool isPacket;
  final int itemsPerPacket;
  final int? unitSellingPriceCents;
  final String? categoryId;
  final String? supplierId;
  final String? imageUrl;
  final int initialStock;
  final int alertLimit;
  final String? shelfLocation;
  final Map<int, ({String label, String value})> customFields;

  const CreateProductEvent({
    required this.shopId,
    required this.name,
    this.barcode,
    this.sku,
    required this.basePriceCents,
    required this.sellingPriceCents,
    this.vatRate = 19.25,
    this.isPacket = false,
    this.itemsPerPacket = 1,
    this.unitSellingPriceCents,
    this.categoryId,
    this.supplierId,
    this.imageUrl,
    this.initialStock = 0,
    this.alertLimit = 5,
    this.shelfLocation,
    this.customFields = const {},
  });
  @override
  List<Object?> get props => [shopId, name, barcode, basePriceCents, sellingPriceCents];
}

class UpdateProductEvent extends CatalogueEvent {
  final String productId;
  final String shopId;
  final String? name;
  final String? barcode;
  final String? sku;
  final int? basePriceCents;
  final int? sellingPriceCents;
  final double? vatRate;
  final bool? isPacket;
  final int? itemsPerPacket;
  final int? unitSellingPriceCents;
  final String? categoryId;
  final String? supplierId;
  final String? imageUrl;
  final int? alertLimit;
  final String? shelfLocation;
  final Map<int, ({String label, String value})> customFields;

  const UpdateProductEvent({
    required this.productId,
    required this.shopId,
    this.name,
    this.barcode,
    this.sku,
    this.basePriceCents,
    this.sellingPriceCents,
    this.vatRate,
    this.isPacket,
    this.itemsPerPacket,
    this.unitSellingPriceCents,
    this.categoryId,
    this.supplierId,
    this.imageUrl,
    this.alertLimit,
    this.shelfLocation,
    this.customFields = const {},
  });
  @override
  List<Object?> get props => [productId, shopId];
}

class DeleteProductEvent extends CatalogueEvent {
  final String productId;
  const DeleteProductEvent(this.productId);
  @override
  List<Object?> get props => [productId];
}

class SelectProductEvent extends CatalogueEvent {
  final ProductEntity? product;
  const SelectProductEvent(this.product);
  @override
  List<Object?> get props => [product?.id];
}

class AdjustStockEvent extends CatalogueEvent {
  final String productId;
  final String shopId;
  final int deltaQuantityBoutique;
  final int deltaQuantityMagasin;
  final String? reason;

  const AdjustStockEvent({
    required this.productId,
    required this.shopId,
    required this.deltaQuantityBoutique,
    this.deltaQuantityMagasin = 0,
    this.reason,
  });
  @override
  List<Object?> get props => [productId, shopId, deltaQuantityBoutique];
}

class LoadCategoriesEvent extends CatalogueEvent {}

// ─── States ───────────────────────────────────────────
enum CatalogueStatus { initial, loading, loaded, saving, error }

class CatalogueState extends Equatable {
  final CatalogueStatus status;
  final List<ProductEntity> products;
  final List<CategoryEntity> categories;
  final ProductEntity? selectedProduct;
  final ProductStockEntity? selectedStock;
  final String? activeShopId;
  final String? searchQuery;
  final String? categoryFilter;
  final String? errorMessage;
  final String? successMessage;

  const CatalogueState({
    this.status = CatalogueStatus.initial,
    this.products = const [],
    this.categories = const [],
    this.selectedProduct,
    this.selectedStock,
    this.activeShopId,
    this.searchQuery,
    this.categoryFilter,
    this.errorMessage,
    this.successMessage,
  });

  bool get isLoading => status == CatalogueStatus.loading;
  bool get isSaving => status == CatalogueStatus.saving;
  int get totalProducts => products.length;
  int get lowStockCount => products.where((p) => false).length; // calculé avec stock

  CatalogueState copyWith({
    CatalogueStatus? status,
    List<ProductEntity>? products,
    List<CategoryEntity>? categories,
    ProductEntity? selectedProduct,
    ProductStockEntity? selectedStock,
    String? activeShopId,
    String? searchQuery,
    String? categoryFilter,
    String? errorMessage,
    String? successMessage,
  }) {
    return CatalogueState(
      status: status ?? this.status,
      products: products ?? this.products,
      categories: categories ?? this.categories,
      selectedProduct: selectedProduct ?? this.selectedProduct,
      selectedStock: selectedStock ?? this.selectedStock,
      activeShopId: activeShopId ?? this.activeShopId,
      searchQuery: searchQuery ?? this.searchQuery,
      categoryFilter: categoryFilter ?? this.categoryFilter,
      errorMessage: errorMessage,
      successMessage: successMessage,
    );
  }

  @override
  List<Object?> get props => [status, products, categories, selectedProduct, selectedStock, searchQuery, categoryFilter, errorMessage, successMessage];
}
