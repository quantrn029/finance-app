import { eachWeekOfInterval, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';

export interface WeekData {
    weekIndex: number;
    start: Date;
    end: Date;
    targets: { revenue: number; profit: number; orders: number };
    actuals: { revenue: number; profit: number; orders: number };
    expenses: { ads: number; operating: number; platform: number };
    progress: { revenue: number; profit: number; orders: number };
}

export interface DailyData {
    month: string; // e.g. "2026-04"
    dayOfMonth: number;
    targets: { revenue: number; profit: number; orders: number };
    actuals: { revenue: number; profit: number; orders: number };
    progress: { revenue: number; profit: number; orders: number };
}

/** Compute weekly breakdown from a monthly goal */
export function computeWeeklyData(monthGoal: any, actualOrders: any[] = [], expenses: any[] = []): WeekData[] {
    const start = startOfMonth(new Date(monthGoal.period + '-01'));
    const end = endOfMonth(start);
    const weeks = eachWeekOfInterval({ start, end });
    const weeksCount = weeks.length;
    const weeklyTarget = {
        revenue: monthGoal.revenueTarget / weeksCount,
        profit: monthGoal.profitTarget / weeksCount,
        orders: Math.round(monthGoal.ordersTarget / weeksCount),
    };

    return weeks.map((w, idx) => {
        const weekStart = w;
        const weekEnd = new Date(w.getTime() + 6 * 24 * 60 * 60 * 1000);

        // Filter orders for this week
        const weekOrders = actualOrders.filter(o => {
            const d = new Date(o.date);
            return d >= weekStart && d <= weekEnd;
        });

        // Filter expenses for this week
        const weekExpenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d >= weekStart && d <= weekEnd;
        });

        const adsCost = weekExpenses.filter(e => e.category === 'Ads' || e.category === 'Marketing').reduce((sum, e) => sum + e.amount, 0);
        const operatingCost = weekExpenses.filter(e => e.category === 'Operating' || e.category === 'Materials').reduce((sum, e) => sum + e.amount, 0);
        const platformCost = weekExpenses.filter(e => e.category === 'Platform').reduce((sum, e) => sum + e.amount, 0);

        const totalExternalExpenses = adsCost + operatingCost + platformCost;

        const actualRevenue = weekOrders.reduce((sum, o) => sum + o.revenue, 0);

        // Profit = Net Payout - External Expenses
        // Note: Net Payout already deducts Platform Fees from orders. 
        // We subtract 'platformCost' here which are ADDITIONAL adjustments/diffs from the Expense table.
        const netPayout = weekOrders.reduce((sum, o) => sum + o.netPayout, 0);
        const actualProfit = netPayout - totalExternalExpenses;

        return {
            weekIndex: idx + 1,
            start: weekStart,
            end: weekEnd,
            targets: weeklyTarget,
            actuals: {
                revenue: actualRevenue,
                profit: actualProfit,
                orders: weekOrders.length
            },
            expenses: {
                ads: adsCost,
                operating: operatingCost,
                platform: platformCost
            },
            progress: {
                revenue: (actualRevenue / weeklyTarget.revenue) * 100,
                profit: (actualProfit / weeklyTarget.profit) * 100,
                orders: (weekOrders.length / weeklyTarget.orders) * 100
            },
        };
    });
}

/** Compute daily breakdown for the current day of a month */
export function computeDailyData(monthGoal: any): DailyData {
    const daysInMonth = getDaysInMonth(new Date(monthGoal.period + '-01'));
    const dailyTarget = {
        revenue: monthGoal.revenueTarget / daysInMonth,
        profit: monthGoal.profitTarget / daysInMonth,
        orders: Math.round(monthGoal.ordersTarget / daysInMonth),
    };
    return {
        month: monthGoal.period,
        dayOfMonth: new Date().getDate(),
        targets: dailyTarget,
        actuals: { revenue: 0, profit: 0, orders: 0 },
        progress: { revenue: 0, profit: 0, orders: 0 },
    };
}
