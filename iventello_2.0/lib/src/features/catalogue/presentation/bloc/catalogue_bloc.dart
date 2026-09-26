import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/catalogue_repository.dart';
import 'catalogue_bloc_events_states.dart';

class CatalogueBloc extends Bloc<CatalogueEvent, CatalogueState> {
  final CatalogueRepository repository;

  CatalogueBloc({required this.repository}) : super(const CatalogueState()) {
    on<LoadProductsEvent>(_onLoad);
    on<SearchProductsEvent>(_onSearch);
    on<FilterByCategoryEvent>(_onFilterCategory);
    on<CreateProductEvent>(_onCreate);
    on<UpdateProductEvent>(_onUpdate);
    on<DeleteProductEvent>(_onDelete);
    on<SelectProductEvent>(_onSelect);
    on<AdjustStockEvent>(_onAdjustStock);
    on<LoadCategoriesEvent>(_onLoadCategories);
  }

  Future<void> _onLoad(LoadProductsEvent event, Emitter<CatalogueState> emit) async {
    emit(state.copyWith(status: CatalogueStatus.loading, activeShopId: event.shopId));
    try {
      final products = await repository.searchProducts(
        shopId: event.shopId,
        categoryId: state.categoryFilter,
        limit: 200,
      );
      final categories = await repository.getCategories();
      emit(state.copyWith(
        status: CatalogueStatus.loaded,
        products: products,
        categories: categories,
        activeShopId: event.shopId,
      ));
    } catch (e) {
      emit(state.copyWith(status: CatalogueStatus.error, errorMessage: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onSearch(SearchProductsEvent event, Emitter<CatalogueState> emit) async {
    emit(state.copyWith(status: CatalogueStatus.loading, searchQuery: event.query));
    try {
      final products = await repository.searchProducts(
        shopId: event.shopId,
        query: event.query.isNotEmpty ? event.query : null,
        categoryId: state.categoryFilter,
        limit: 100,
      );
      emit(state.copyWith(status: CatalogueStatus.loaded, products: products));
    } catch (e) {
      emit(state.copyWith(status: CatalogueStatus.error, errorMessage: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onFilterCategory(FilterByCategoryEvent event, Emitter<CatalogueState> emit) async {
    if (state.activeShopId == null) return;
    emit(state.copyWith(categoryFilter: event.categoryId, status: CatalogueStatus.loading));
    try {
      final products = await repository.searchProducts(
        shopId: state.activeShopId!,
        query: state.searchQuery,
        categoryId: event.categoryId,
        limit: 200,
      );
      emit(state.copyWith(status: CatalogueStatus.loaded, products: products));
    } catch (e) {
      emit(state.copyWith(status: CatalogueStatus.error, errorMessage: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onCreate(CreateProductEvent event, Emitter<CatalogueState> emit) async {
    emit(state.copyWith(status: CatalogueStatus.saving, errorMessage: null));
    try {
      final cf = event.customFields;
      final product = await repository.createProduct(
        shopId: event.shopId,
        name: event.name,
        barcode: event.barcode,
        sku: event.sku,
        basePriceCents: event.basePriceCents,
        sellingPriceCents: event.sellingPriceCents,
        vatRate: event.vatRate,
        isPacket: event.isPacket,
        itemsPerPacket: event.itemsPerPacket,
        unitSellingPriceCents: event.unitSellingPriceCents,
        categoryId: event.categoryId,
        supplierId: event.supplierId,
        imageUrl: event.imageUrl,
        initialStock: event.initialStock,
        alertLimit: event.alertLimit,
        shelfLocation: event.shelfLocation,
        field1Label: cf[1]?.label, field1Value: cf[1]?.value,
        field2Label: cf[2]?.label, field2Value: cf[2]?.value,
        field3Label: cf[3]?.label, field3Value: cf[3]?.value,
        field4Label: cf[4]?.label, field4Value: cf[4]?.value,
        field5Label: cf[5]?.label, field5Value: cf[5]?.value,
        field6Label: cf[6]?.label, field6Value: cf[6]?.value,
        field7Label: cf[7]?.label, field7Value: cf[7]?.value,
        field8Label: cf[8]?.label, field8Value: cf[8]?.value,
        field9Label: cf[9]?.label, field9Value: cf[9]?.value,
        field10Label: cf[10]?.label, field10Value: cf[10]?.value,
      );

      final updated = [product, ...state.products];
      emit(state.copyWith(
        status: CatalogueStatus.loaded,
        products: updated,
        selectedProduct: product,
        successMessage: 'Produit "${product.name}" créé avec succès.',
      ));
    } catch (e) {
      emit(state.copyWith(status: CatalogueStatus.error, errorMessage: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onUpdate(UpdateProductEvent event, Emitter<CatalogueState> emit) async {
    emit(state.copyWith(status: CatalogueStatus.saving, errorMessage: null));
    try {
      final cf = event.customFields;
      final product = await repository.updateProduct(
        productId: event.productId,
        shopId: event.shopId,
        name: event.name,
        barcode: event.barcode,
        sku: event.sku,
        basePriceCents: event.basePriceCents,
        sellingPriceCents: event.sellingPriceCents,
        vatRate: event.vatRate,
        isPacket: event.isPacket,
        itemsPerPacket: event.itemsPerPacket,
        unitSellingPriceCents: event.unitSellingPriceCents,
        categoryId: event.categoryId,
        supplierId: event.supplierId,
        imageUrl: event.imageUrl,
        alertLimit: event.alertLimit,
        shelfLocation: event.shelfLocation,
        field1Label: cf[1]?.label, field1Value: cf[1]?.value,
        field2Label: cf[2]?.label, field2Value: cf[2]?.value,
        field3Label: cf[3]?.label, field3Value: cf[3]?.value,
        field4Label: cf[4]?.label, field4Value: cf[4]?.value,
        field5Label: cf[5]?.label, field5Value: cf[5]?.value,
        field6Label: cf[6]?.label, field6Value: cf[6]?.value,
        field7Label: cf[7]?.label, field7Value: cf[7]?.value,
        field8Label: cf[8]?.label, field8Value: cf[8]?.value,
        field9Label: cf[9]?.label, field9Value: cf[9]?.value,
        field10Label: cf[10]?.label, field10Value: cf[10]?.value,
      );

      final updated = state.products.map((p) => p.id == product.id ? product : p).toList();
      emit(state.copyWith(
        status: CatalogueStatus.loaded,
        products: updated,
        selectedProduct: product,
        successMessage: 'Produit mis à jour.',
      ));
    } catch (e) {
      emit(state.copyWith(status: CatalogueStatus.error, errorMessage: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onDelete(DeleteProductEvent event, Emitter<CatalogueState> emit) async {
    try {
      await repository.deleteProduct(event.productId);
      final updated = state.products.where((p) => p.id != event.productId).toList();
      emit(state.copyWith(
        status: CatalogueStatus.loaded,
        products: updated,
        selectedProduct: null,
        successMessage: 'Produit supprimé.',
      ));
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString().replaceAll('Exception: ', '')));
    }
  }

  void _onSelect(SelectProductEvent event, Emitter<CatalogueState> emit) {
    emit(state.copyWith(selectedProduct: event.product));
  }

  Future<void> _onAdjustStock(AdjustStockEvent event, Emitter<CatalogueState> emit) async {
    try {
      await repository.adjustStock(
        productId: event.productId,
        shopId: event.shopId,
        deltaQuantityBoutique: event.deltaQuantityBoutique,
        deltaQuantityMagasin: event.deltaQuantityMagasin,
        reason: event.reason,
      );
      final stock = await repository.getStock(productId: event.productId, shopId: event.shopId);
      emit(state.copyWith(selectedStock: stock, successMessage: 'Stock mis à jour.'));
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onLoadCategories(LoadCategoriesEvent event, Emitter<CatalogueState> emit) async {
    try {
      final cats = await repository.getCategories();
      emit(state.copyWith(categories: cats));
    } catch (e) {
      emit(state.copyWith(errorMessage: e.toString().replaceAll('Exception: ', '')));
    }
  }
}
