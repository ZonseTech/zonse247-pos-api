import { Router } from 'express';
import { GoodsReceiptController } from '../controllers/goods-receipt.controller';
import { validateBody, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { goodsReceiptSchemas } from '../validations/goods-receipt.schemas';

const router = Router();

router.post('/', validateBody(goodsReceiptSchemas.createGoodsReceipt), GoodsReceiptController.createGoodsReceipt);
router.get('/', validateQuery(goodsReceiptSchemas.listQuery), GoodsReceiptController.listGoodsReceipts);
router.get('/:goodsReceiptId', validateParams(goodsReceiptSchemas.idParam), GoodsReceiptController.getGoodsReceipt);
router.put('/:goodsReceiptId', validateParams(goodsReceiptSchemas.idParam), validateBody(goodsReceiptSchemas.updateGoodsReceipt), GoodsReceiptController.updateGoodsReceipt);
router.post('/:goodsReceiptId/verify', validateParams(goodsReceiptSchemas.idParam), validateBody(goodsReceiptSchemas.verifyGoodsReceipt), GoodsReceiptController.verifyGoodsReceipt);
router.post('/:goodsReceiptId/post', validateParams(goodsReceiptSchemas.idParam), validateBody(goodsReceiptSchemas.postGoodsReceipt), GoodsReceiptController.postGoodsReceipt);
router.post('/:goodsReceiptId/cancel', validateParams(goodsReceiptSchemas.idParam), GoodsReceiptController.cancelGoodsReceipt);
router.delete('/:goodsReceiptId', validateParams(goodsReceiptSchemas.idParam), GoodsReceiptController.deleteGoodsReceipt);

export default router;
