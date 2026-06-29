import { Router } from 'express';
import * as deliveryService from '../services/delivery.service';

const router = Router();

// GET /api/delivery/zones — list delivery zones (public)
router.get('/zones', async (_req, res) => {
  try {
    const zones = await deliveryService.listDeliveryZones();
    res.json({ data: zones });
  } catch (error) {
    console.error('Error listing zones:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/delivery/estimate — get delivery estimate (public)
router.get('/estimate', async (req, res) => {
  try {
    const { zipCode, state, zoneId } = req.query;

    let zone;
    if (zoneId) {
      // Direct zone lookup
      const estimate = await deliveryService.calculateDeliveryEstimate(zoneId as string);
      if (!estimate) {
        res.status(404).json({ error: 'Zone not found', code: 'NOT_FOUND' });
        return;
      }
      res.json({ data: estimate });
      return;
    }

    if (zipCode) {
      zone = await deliveryService.findZoneByZip(zipCode as string);
    } else if (state) {
      zone = await deliveryService.findZoneByState(state as string);
    } else {
      res.status(400).json({ error: 'Provide zipCode, state, or zoneId', code: 'MISSING_PARAM' });
      return;
    }

    if (!zone) {
      res.json({
        data: { available: false, message: 'Delivery not available to this location' },
      });
      return;
    }

    const estimate = await deliveryService.calculateDeliveryEstimate(zone.id);
    res.json({ data: estimate });
  } catch (error) {
    console.error('Error calculating estimate:', (error as Error).message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
