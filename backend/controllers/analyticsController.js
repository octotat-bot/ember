import Order from '../models/Order.js';
import Table from '../models/Table.js';
import MenuItem from '../models/MenuItem.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// @desc    Generate end-of-night story report
// @route   GET /api/analytics/night-report
// @access  Private (Admin)
export const getNightReport = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all today's orders
    const orders = await Order.find({
        createdAt: { $gte: today, $lt: tomorrow }
    }).populate('waiter', 'name').populate('items.menuItem', 'name category costPrice');

    const completedOrders = orders.filter(o => o.status === 'completed');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    // Revenue
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Peak hour
    const hourCounts = {};
    orders.forEach(o => {
        const h = new Date(o.createdAt).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];

    // Top items
    const itemCounts = {};
    orders.forEach(o => {
        (o.items || []).forEach(i => {
            const key = i.name;
            if (!itemCounts[key]) itemCounts[key] = { name: key, quantity: 0, revenue: 0 };
            itemCounts[key].quantity += i.quantity;
            itemCounts[key].revenue += i.price * i.quantity;
        });
    });
    const topItems = Object.values(itemCounts).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    // Top waiter
    const waiterStats = {};
    orders.forEach(o => {
        const name = o.waiter?.name || 'Unknown';
        if (!waiterStats[name]) waiterStats[name] = { name, orders: 0, revenue: 0 };
        waiterStats[name].orders++;
        if (o.status === 'completed') waiterStats[name].revenue += o.totalAmount || 0;
    });
    const topWaiter = Object.values(waiterStats).sort((a, b) => b.revenue - a.revenue)[0];

    // Average service time (minutes)
    const serviceTimes = completedOrders
        .filter(o => o.completedAt && o.createdAt)
        .map(o => (new Date(o.completedAt) - new Date(o.createdAt)) / 60000);
    const avgServiceTime = serviceTimes.length > 0
        ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
        : 0;

    // Food cost (if costPrice tracked)
    let totalCost = 0;
    completedOrders.forEach(o => {
        (o.items || []).forEach(i => {
            const cp = i.menuItem?.costPrice || 0;
            totalCost += cp * i.quantity;
        });
    });
    const foodCostPct = totalRevenue > 0 ? ((totalCost / totalRevenue) * 100).toFixed(1) : 0;

    // Tables served
    const tablesUsed = new Set(orders.map(o => o.tableNumber)).size;

    // Build narrative
    const formatHour = (h) => {
        const suffix = h >= 12 ? 'pm' : 'am';
        const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${display}${suffix}`;
    };

    const narrative = [
        `Tonight, Ember served ${completedOrders.length} orders across ${tablesUsed} tables, bringing in ₹${totalRevenue.toFixed(0)} in total revenue.`,
        avgOrderValue > 0 ? `The average order was worth ₹${avgOrderValue.toFixed(0)}.` : '',
        peakHour ? `The busiest hour was ${formatHour(parseInt(peakHour[0]))} with ${peakHour[1]} orders.` : '',
        topItems.length > 0 ? `The crowd favorite tonight was "${topItems[0].name}" with ${topItems[0].quantity} ordered.` : '',
        topWaiter ? `${topWaiter.name} led the floor with ${topWaiter.orders} orders and ₹${topWaiter.revenue.toFixed(0)} in revenue.` : '',
        avgServiceTime > 0 ? `Average service time was ${avgServiceTime.toFixed(0)} minutes.` : '',
        cancelledOrders.length > 0 ? `${cancelledOrders.length} order${cancelledOrders.length > 1 ? 's were' : ' was'} cancelled.` : 'No cancellations tonight — clean run!',
        totalCost > 0 ? `Food cost came in at ${foodCostPct}% of revenue.` : '',
    ].filter(Boolean).join(' ');

    res.json({
        success: true,
        data: {
            date: today.toISOString().split('T')[0],
            narrative,
            stats: {
                totalOrders: orders.length,
                completedOrders: completedOrders.length,
                cancelledOrders: cancelledOrders.length,
                totalRevenue,
                avgOrderValue,
                peakHour: peakHour ? { hour: formatHour(parseInt(peakHour[0])), count: peakHour[1] } : null,
                avgServiceTime: Math.round(avgServiceTime),
                tablesServed: tablesUsed,
                foodCostPct: parseFloat(foodCostPct),
                totalCost
            },
            topItems,
            topWaiter,
            waiterBreakdown: Object.values(waiterStats)
        }
    });
});

// @desc    Get profitability analytics (food cost & margin)
// @route   GET /api/analytics/profitability
// @access  Private (Admin)
export const getProfitability = asyncHandler(async (req, res) => {
    const items = await MenuItem.find({})
        .select('name category price costPrice discount popularity')
        .sort({ popularity: -1 });

    const withMargin = items.map(item => {
        const sellPrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
        const margin = item.costPrice > 0 ? ((sellPrice - item.costPrice) / sellPrice * 100) : null;
        return {
            _id: item._id,
            name: item.name,
            category: item.category,
            price: item.price,
            costPrice: item.costPrice,
            sellPrice,
            margin: margin !== null ? parseFloat(margin.toFixed(1)) : null,
            profit: item.costPrice > 0 ? sellPrice - item.costPrice : null,
            totalOrdered: item.popularity || 0,
            totalRevenue: (item.popularity || 0) * sellPrice,
            totalProfit: item.costPrice > 0 ? (item.popularity || 0) * (sellPrice - item.costPrice) : null
        };
    });

    // Category breakdown
    const categories = {};
    withMargin.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = { category: item.category, items: 0, avgMargin: 0, totalRevenue: 0, totalProfit: 0 };
        }
        categories[item.category].items++;
        categories[item.category].totalRevenue += item.totalRevenue;
        if (item.totalProfit !== null) categories[item.category].totalProfit += item.totalProfit;
    });

    Object.values(categories).forEach(cat => {
        cat.avgMargin = cat.totalRevenue > 0
            ? parseFloat(((cat.totalRevenue - (cat.totalRevenue - cat.totalProfit)) / cat.totalRevenue * 100).toFixed(1))
            : 0;
    });

    res.json({
        success: true,
        data: {
            items: withMargin,
            categories: Object.values(categories),
            summary: {
                totalItems: items.length,
                itemsWithCost: items.filter(i => i.costPrice > 0).length,
                avgMargin: withMargin.filter(i => i.margin !== null).length > 0
                    ? (withMargin.filter(i => i.margin !== null).reduce((s, i) => s + i.margin, 0) / withMargin.filter(i => i.margin !== null).length).toFixed(1)
                    : null
            }
        }
    });
});

// @desc    Get slow hour comparison data
// @route   GET /api/analytics/slow-hours
// @access  Private (Admin)
export const getSlowHours = asyncHandler(async (req, res) => {
    const now = new Date();
    const currentHour = now.getHours();

    // Get last 4 weeks of data for the same day of week
    const dayOfWeek = now.getDay();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const historicalOrders = await Order.find({
        createdAt: { $gte: fourWeeksAgo, $lt: now },
        status: { $in: ['completed', 'served'] }
    }).select('totalAmount createdAt');

    // Group by hour for same day of week
    const hourlyAvg = {};
    for (let h = 0; h < 24; h++) hourlyAvg[h] = { total: 0, count: 0 };

    historicalOrders.forEach(o => {
        const d = new Date(o.createdAt);
        if (d.getDay() === dayOfWeek) {
            const h = d.getHours();
            hourlyAvg[h].total += o.totalAmount || 0;
            hourlyAvg[h].count++;
        }
    });

    // Calculate averages
    const hourlyData = [];
    for (let h = 8; h <= 23; h++) {
        const avg = hourlyAvg[h].count > 0 ? hourlyAvg[h].total / 4 : 0; // Average over 4 weeks
        hourlyData.push({
            hour: h,
            label: `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`,
            avgRevenue: Math.round(avg),
            historicalOrders: hourlyAvg[h].count
        });
    }

    // Today's current hour revenue
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const currentHourStart = new Date(now);
    currentHourStart.setMinutes(0, 0, 0);

    const currentHourOrders = await Order.find({
        createdAt: { $gte: currentHourStart },
        status: { $nin: ['cancelled'] }
    });
    const currentRevenue = currentHourOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const expectedRevenue = hourlyData.find(h => h.hour === currentHour)?.avgRevenue || 0;
    const isSlowHour = expectedRevenue > 0 && currentRevenue < expectedRevenue * 0.5;

    res.json({
        success: true,
        data: {
            currentHour,
            currentRevenue,
            expectedRevenue,
            isSlowHour,
            pctOfExpected: expectedRevenue > 0 ? Math.round((currentRevenue / expectedRevenue) * 100) : 100,
            hourlyData
        }
    });
});
