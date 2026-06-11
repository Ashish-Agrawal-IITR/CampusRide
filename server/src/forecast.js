/**
 * Lightweight, dependency-free demand forecaster.
 *
 * Pipeline (mirrors a classic decomposition approach):
 *   1. Aggregate historical rides into a daily count series.
 *   2. Fit an Ordinary-Least-Squares linear trend on the day index.
 *   3. Estimate a multiplicative day-of-week seasonal index.
 *   4. EWMA-smooth the most recent residuals to capture short-term level.
 *   5. Project trend * seasonality forward H days; widen a simple band by RMSE.
 *
 * Returns { actual:[{label,value}], forecast:[{label,value,lo,hi}], model }.
 * This is intentionally transparent so it can be swapped for an
 * ARIMA / Prophet / LightGBM service later without touching the API surface.
 */

function ols(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}

export function forecastDemand(dailyCounts, horizon = 14) {
  // dailyCounts: [{ date: 'YYYY-MM-DD', count, dow }]  (oldest -> newest)
  const n = dailyCounts.length;
  if (n < 4) {
    const base = n ? dailyCounts[n - 1].count : 400;
    const forecast = Array.from({ length: horizon }, (_, i) => ({
      label: `D${i + 1}`, value: base, lo: Math.round(base * 0.8), hi: Math.round(base * 1.2),
    }));
    return { actual: dailyCounts.map((d, i) => ({ label: `D${i + 1}`, value: d.count })), forecast, model: 'naive' };
  }

  const xs = dailyCounts.map((_, i) => i);
  const ys = dailyCounts.map(d => d.count);
  const { slope, intercept } = ols(xs, ys);
  const trend = i => intercept + slope * i;

  // Multiplicative weekly seasonal index.
  const dowRatios = Array.from({ length: 7 }, () => []);
  dailyCounts.forEach((d, i) => {
    const t = trend(i);
    if (t > 0) dowRatios[d.dow].push(d.count / t);
  });
  const seasonal = dowRatios.map(r => (r.length ? r.reduce((a, b) => a + b, 0) / r.length : 1));
  const meanSeasonal = seasonal.reduce((a, b) => a + b, 0) / 7 || 1;
  const seasonalNorm = seasonal.map(s => s / meanSeasonal);

  // Residual RMSE for the band.
  let sse = 0;
  dailyCounts.forEach((d, i) => {
    const fit = trend(i) * seasonalNorm[d.dow];
    sse += (d.count - fit) ** 2;
  });
  const rmse = Math.sqrt(sse / n);

  // EWMA level correction from recent residuals.
  let ewma = 0; const alpha = 0.4;
  dailyCounts.forEach((d, i) => {
    const resid = d.count - trend(i) * seasonalNorm[d.dow];
    ewma = alpha * resid + (1 - alpha) * ewma;
  });

  const lastDow = dailyCounts[n - 1].dow;
  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const idx = n - 1 + h;
    const dow = (lastDow + h) % 7;
    const point = Math.max(0, Math.round(trend(idx) * seasonalNorm[dow] + ewma * Math.pow(1 - alpha, h)));
    forecast.push({
      label: `D${h}`,
      value: point,
      lo: Math.max(0, Math.round(point - 1.28 * rmse)),  // ~80% band
      hi: Math.round(point + 1.28 * rmse),
    });
  }

  return {
    actual: dailyCounts.map((d, i) => ({ label: `D${i + 1}`, value: d.count })),
    forecast,
    model: 'trend+weekly-seasonality+ewma',
    diagnostics: { slope: +slope.toFixed(2), rmse: +rmse.toFixed(1) },
  };
}
