import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { eachSeries } from 'async';
import { INVENTORY_DB, CATEGORY_DB } from '../databases/local/tables';
import { sealDBModel } from '../databases/local';
import { CartItem, Category, Product } from '@/types';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
	res.send('Inventory API');
});

router.get(
	'/product/:productId',
	async function (req: Request, res: Response): Promise<void> {
		try {
			if (!req.params.productId) {
				res.status(500).send('ID field is required.');
				return;
			}

			const product = await sealDBModel.findById(
				INVENTORY_DB,
				req.params.productId
			);
			res.send(product);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

router.get(
	'/products-only',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const docs = await sealDBModel.find(INVENTORY_DB, {
				status: { $ne: 'void' },
			});
			res.send(docs);
		} catch (err) {
			console.error('Error fetching products:', err);
			res.status(500).send({ error: 'Server error' });
		}
	}
);

router.get(
	'/products',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const categories: Array<Category> = await sealDBModel.findAll(
				CATEGORY_DB
			);

			const categoryMap = new Map<string, Category>();
			categories.forEach((category) => {
				categoryMap.set(category.uuid.toString(), category);
				if (category.name) {
					categoryMap.set(category.name as string, category);
				}
			});

			const products: Array<Product> = await sealDBModel.find(INVENTORY_DB, {
				status: { $ne: 'void' },
			});

			const enhancedProducts = products.map((product) => {
				if (product.categoryId) {
					const categoryKey = product.categoryId.toString();
					if (categoryMap.has(categoryKey)) {
						product.categoryDetails = categoryMap.get(categoryKey);
					}
				}
				return product;
			});

			res.send(enhancedProducts);
		} catch (error) {
			console.error('Error:', error);
			res.status(500).send({ error: 'Server error' });
		}
	}
);

const validateProduct = (params: Record<string, string>): Product => {
	const Product: Product = {
		uuid: params.uuid,
		barcode: parseInt(params.barcode),
		expirationDate: params.expirationDate,
		costPrice: params.costPrice,
		sellPrice: params.sellPrice,
		promoPrice: params.promoPrice,
		categoryId: params.categoryId,
		quantity: params.quantity == '' ? 0 : params.quantity,
		originalQuantity: parseInt(params.quantity == '' ? '0' : params.quantity),
		name: params.name,
		stock: params.stock === 'on' ? 0 : 1,
		minStock: params.minStock,
	};

	return Product;
};

router.post(
	'/product',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const Product: Product = validateProduct(req.body);

			Product.status = 'active';
			Product.uuid = uuidv4();
			await sealDBModel.insert(INVENTORY_DB, Product);
			res.sendStatus(200);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

router.put(
	'/product/:productId',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const Product: Product = validateProduct(req.body);
			const productId = req.params.productId;
			await sealDBModel.update(INVENTORY_DB, productId, Product);
			res.sendStatus(200);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

router.put(
	'/product-void/:productId',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const productId = req.params.productId;
			const numReplaced = await sealDBModel.update(INVENTORY_DB, productId, {
				status: 'void',
			});

			if (numReplaced === 0) {
				res.status(404).json({
					error: 'Not Found',
					message: 'Product not found.',
				});
			} else {
				res.sendStatus(200);
			}
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

router.delete(
	'/product/:productId',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const productId = req.params.productId;
			await sealDBModel.delete(INVENTORY_DB, productId);
			res.sendStatus(200);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

router.post(
	'/product/sku',
	async function (req: Request, res: Response): Promise<void> {
		try {
			const sku = req.body.skuCode;
			const doc = await sealDBModel.find(INVENTORY_DB, {
				barcode: parseInt(sku),
			});

			res.send(doc.length > 0 ? doc[0] : null);
		} catch (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal Server Error',
				message: 'An unexpected error occurred.',
			});
		}
	}
);

export async function decrementInventory(
	products: Array<CartItem>
): Promise<void> {
	return new Promise((resolve, reject) => {
		eachSeries(
			products,
			async function (
				transactionProduct: CartItem,
				callback: (err?: Error) => void
			) {
				try {
					const product = await sealDBModel.findById(
						INVENTORY_DB,
						transactionProduct.productId as any
					);

					if (!product || !product.quantity) {
						callback();
					} else {
						const updatedQuantity =
							parseInt(product.quantity.toString()) -
							parseInt(transactionProduct.quantity.toString());

						await sealDBModel.update(INVENTORY_DB, product.uuid, {
							quantity: updatedQuantity,
						});
					}
				} catch (error) {
					callback(error as Error);
				}
			},
			(err) => {
				if (err) reject(err);
				else resolve();
			}
		);
	});
}

export default router;
