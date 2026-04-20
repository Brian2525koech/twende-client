import { Router } from 'express'
import { submitPing, getActivePings, driverGoOffline } from '../controllers/pingController'
import { requireDriver, requireAuth } from '../middleware/authMiddleware'

const router = Router()

router.post('/', requireDriver, submitPing)
router.get('/active', getActivePings)
router.get('/latest/:driverId', requireAuth, async (req, res) => {
  const { driverId } = req.params
  try {
    const { query } = await import('../config/db')
    const result = await query(
      'SELECT lat, lng, speed, created_at FROM pings WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 1',
      [driverId]
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching ping' })
  }
})
router.post('/offline', requireDriver, driverGoOffline)

export default router