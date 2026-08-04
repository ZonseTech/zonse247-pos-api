import { Router } from 'express';
import { GoodsReceiptController } from '../controllers/goods-receipt.controller';
import { PermissionMiddleware } from '../middlewares/permission.middleware';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { goodsReceiptSchemas } from '../validations/goods-receipt.schemas';

const router = Router();
const permissionMiddleware = new PermissionMiddleware();

router.post('/', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateBody(goodsReceiptSchemas.createGoodsReceipt), GoodsReceiptController.createGoodsReceipt);
router.get('/', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateQuery(goodsReceiptSchemas.listQuery), GoodsReceiptController.listGoodsReceipts);
router.get('/:goodsReceiptId', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateParams(goodsReceiptSchemas.idParam), GoodsReceiptController.getGoodsReceipt);
router.put('/:goodsReceiptId', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateParams(goodsReceiptSchemas.idParam), validateBody(goodsReceiptSchemas.updateGoodsReceipt), GoodsReceiptController.updateGoodsReceipt);
router.post('/:goodsReceiptId/verify', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateParams(goodsReceiptSchemas.idParam), validateBody(goodsReceiptSchemas.verifyGoodsReceipt), GoodsReceiptController.verifyGoodsReceipt);
router.post('/:goodsReceiptId/post', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateParams(goodsReceiptSchemas.idParam), validateBody(goodsReceiptSchemas.postGoodsReceipt), GoodsReceiptController.postGoodsReceipt);
router.post('/:goodsReceiptId/cancel', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateParams(goodsReceiptSchemas.idParam), GoodsReceiptController.cancelGoodsReceipt);
router.delete('/:goodsReceiptId', permissionMiddleware.requireAnyPermission(['suppliers.orders', 'inventory.receive']), validateParams(goodsReceiptSchemas.idParam), GoodsReceiptController.deleteGoodsReceipt);

export default router;
