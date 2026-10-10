const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/transactionController');

router.use(auth);
router.get('/summary', controller.summary);
router.route('/').get(controller.list).post(controller.create);
router.route('/:id').put(controller.update).delete(controller.remove);
module.exports = router;
