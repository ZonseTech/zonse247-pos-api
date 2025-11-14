import { Request, Response, Router } from 'express';
import { ShopController } from '../controllers/shop.controller';

const router = Router();

router.get('/', function (req: Request, res: Response): void {
	res.send('Shop API');
});

router.get('/all', ShopController.list);
router.post('/post', ShopController.create);
router.put('/update/:id', ShopController.update);
router.get('/shop/:id', ShopController.show);
router.delete('/shop/:id', ShopController.delete);

export default router;