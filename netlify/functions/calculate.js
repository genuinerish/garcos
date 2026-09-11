exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const data = JSON.parse(event.body);
        const { fabricTypeMode, measurementUnit, fabricGsms, fabricRates, measurementSections, garmentParts } = data;

        let totalGarmentWeight = 0;
        let totalCalculatedFabricCost = 0;
        let partBreakdown = {};

        garmentParts.forEach(p => {
            partBreakdown[p.id] = { id: p.id, name: p.name, color: p.color || 'indigo', weight: 0, cost: 0 };
        });

        const unitFactor = (measurementUnit === 'inch') ? (2.54 * 2.54) : 1.0;
        let cardWeights = [];
        let rowTotalsData = [];

        if (fabricTypeMode === 'woven') {
            // Handled via frontend
        } else {
            measurementSections.forEach((card) => {
                let multiplier = parseFloat(card.multiplier) || 1;
                let assignedFabricKey = card.fabricId || Object.keys(fabricGsms)[0];
                let assignedPartKey = card.partId || garmentParts[0].id;
                let cardTotalWeight = 0;

                let activeFabricGsm = fabricGsms[assignedFabricKey] || Object.values(fabricGsms)[0] || 0;

                let rowTotals = [];
                card.rows.forEach((row, rIdx) => {
                    let val = parseFloat(row.mmt) || 0;
                    let allow = parseFloat(row.allow) || 0;
                    let rowTotal = val > 0 ? (val + allow) : 0;

                    rowTotalsData.push({ cardId: card.id, rowIndex: rIdx, rowTotal });

                    if (rowTotal > 0) {
                        rowTotals.push(rowTotal);
                    }
                });

                let totalLength = 0;
                let totalWidth = 0;

                if (rowTotals.length >= 3) {
                    totalLength = rowTotals[0] + rowTotals[2];
                    totalWidth = rowTotals[1];
                } else if (rowTotals.length === 2) {
                    totalLength = rowTotals[0];
                    totalWidth = rowTotals[1];
                } else if (rowTotals.length === 1) {
                    totalLength = rowTotals[0];
                    totalWidth = 1;
                }

                if (activeFabricGsm > 0 && totalLength > 0 && totalWidth > 0) {
                    cardTotalWeight = (totalLength * totalWidth * activeFabricGsm * multiplier * unitFactor) / 10000000;
                }

                cardWeights.push({ cardId: card.id, weight: cardTotalWeight });
                totalGarmentWeight += cardTotalWeight;

                let assignedRate = fabricRates[assignedFabricKey] || 0;
                let cardCost = cardTotalWeight * assignedRate;
                totalCalculatedFabricCost += cardCost;

                if (!partBreakdown[assignedPartKey]) {
                    partBreakdown[assignedPartKey] = { id: assignedPartKey, name: 'Part', color: 'indigo', weight: 0, cost: 0 };
                }
                partBreakdown[assignedPartKey].weight += cardTotalWeight;
                partBreakdown[assignedPartKey].cost += cardCost;
            });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                totalGarmentWeight,
                totalCalculatedFabricCost,
                partBreakdown,
                cardWeights,
                rowTotals: rowTotalsData
            })
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};