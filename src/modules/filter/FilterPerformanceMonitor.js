/**
 * Filter Performance Monitor Module
 * 
 * Comprehensive performance tracking and monitoring for filter operations.
 * Ensures <50ms filter application performance target is met and measured.
 * 
 * @module FilterPerformanceMonitor
 */

/**
 * @typedef {Object} PerformanceMetric
 * @property {string} operation - Operation name
 * @property {number} duration - Execution duration in milliseconds
 * @property {number} timestamp - Operation timestamp
 * @property {boolean} success - Whether operation succeeded
 * @property {Object} metadata - Additional operation metadata
 */

/**
 * @typedef {Object} PerformanceThresholds
 * @property {number} filterApplication - Filter application threshold (ms)
 * @property {number} domOperation - DOM operation threshold (ms)
 * @property {number} cacheOperation - Cache operation threshold (ms)
 * @property {number} predicateExecution - Predicate execution threshold (ms)
 */

/**
 * @typedef {Object} PerformanceReport
 * @property {Object} summary - Performance summary statistics
 * @property {Array} violations - Performance threshold violations
 * @property {Array} trends - Performance trends
 * @property {Object} recommendations - Performance improvement recommendations
 */

/**
 * FilterPerformanceMonitor class for comprehensive performance tracking
 */
export class FilterPerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      maxMetrics: options.maxMetrics || 1000,
      reportingInterval: options.reportingInterval || 30000, // 30 seconds
      enableRealTimeMonitoring: options.enableRealTimeMonitoring !== false,
      enableTrendAnalysis: options.enableTrendAnalysis !== false,
      alertThreshold: options.alertThreshold || 2, // 2x normal performance
      ...options
    };

    // Performance thresholds (target <50ms for filter application)
    this.thresholds = {
      filterApplication: options.filterApplicationThreshold || 50,
      domOperation: options.domOperationThreshold || 10,
      cacheOperation: options.cacheOperationThreshold || 1,
      predicateExecution: options.predicateExecutionThreshold || 0.5,
      ...options.thresholds
    };

    // Metrics storage
    /** @type {Array<PerformanceMetric>} */
    this.metrics = [];
    
    // Real-time tracking
    this.currentOperations = new Map();
    this.operationCounters = new Map();
    
    // Performance trends
    this.trendData = new Map();
    this.baselinePerformance = new Map();
    
    // Violation tracking
    this.violations = [];
    this.alertCallbacks = new Set();
    
    // Reporting
    this.reportTimer = null;
    this.lastReport = null;
    
    // Start monitoring
    if (this.options.enableRealTimeMonitoring) {
      this.startReporting();
    }
    
    console.log('FilterPerformanceMonitor initialized with thresholds:', this.thresholds);
  }

  /**
   * Start a performance measurement
   * @param {string} operation - Operation name
   * @param {Object} [metadata={}] - Additional metadata
   * @returns {string} Measurement ID
   */
  startMeasurement(operation, metadata = {}) {
    const measurementId = this.generateMeasurementId(operation);
    
    const measurement = {
      id: measurementId,
      operation,
      startTime: performance.now(),
      timestamp: Date.now(),
      metadata
    };

    this.currentOperations.set(measurementId, measurement);
    
    // Increment operation counter
    const count = this.operationCounters.get(operation) || 0;
    this.operationCounters.set(operation, count + 1);

    return measurementId;
  }

  /**
   * End a performance measurement
   * @param {string} measurementId - Measurement ID from startMeasurement
   * @param {boolean} [success=true] - Whether operation succeeded
   * @param {Object} [additionalMetadata={}] - Additional metadata
   * @returns {PerformanceMetric|null} Completed metric or null if not found
   */
  endMeasurement(measurementId, success = true, additionalMetadata = {}) {
    const measurement = this.currentOperations.get(measurementId);
    if (!measurement) {
      console.warn(`Performance measurement not found: ${measurementId}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - measurement.startTime;

    const metric = {
      operation: measurement.operation,
      duration,
      timestamp: measurement.timestamp,
      success,
      metadata: {
        ...measurement.metadata,
        ...additionalMetadata,
        measurementId
      }
    };

    // Remove from current operations
    this.currentOperations.delete(measurementId);

    // Store metric
    this.recordMetric(metric);

    // Check for threshold violations
    this.checkThresholdViolation(metric);

    // Update trends
    if (this.options.enableTrendAnalysis) {
      this.updateTrends(metric);
    }

    return metric;
  }

  /**
   * Record a direct performance metric
   * @param {PerformanceMetric} metric - Performance metric
   */
  recordMetric(metric) {
    this.metrics.push(metric);

    // Maintain maximum metrics limit
    if (this.metrics.length > this.options.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations
    if (metric.duration > this.getThreshold(metric.operation) * 2) {
      console.warn(`Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  /**
   * Measure a function execution
   * @param {string} operation - Operation name
   * @param {Function} fn - Function to measure
   * @param {Object} [metadata={}] - Additional metadata
   * @returns {Promise<*>} Function result
   */
  async measureFunction(operation, fn, metadata = {}) {
    const measurementId = this.startMeasurement(operation, metadata);
    
    try {
      const result = await fn();
      this.endMeasurement(measurementId, true, { hasResult: true });
      return result;
    } catch (error) {
      this.endMeasurement(measurementId, false, { error: error.message });
      throw error;
    }
  }

  /**
   * Get performance statistics for an operation
   * @param {string} operation - Operation name
   * @param {number} [timeWindow=300000] - Time window in milliseconds (default: 5 minutes)
   * @returns {Object} Performance statistics
   */
  getOperationStats(operation, timeWindow = 300000) {
    const cutoff = Date.now() - timeWindow;
    const operationMetrics = this.metrics.filter(
      metric => metric.operation === operation && metric.timestamp > cutoff
    );

    if (operationMetrics.length === 0) {
      return {
        operation,
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        thresholdViolations: 0,
        meetsTarget: true
      };
    }

    const durations = operationMetrics.map(m => m.duration);
    const successfulOps = operationMetrics.filter(m => m.success);
    const threshold = this.getThreshold(operation);
    const violations = operationMetrics.filter(m => m.duration > threshold);

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    return {
      operation,
      count: operationMetrics.length,
      averageDuration: avgDuration,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: successfulOps.length / operationMetrics.length,
      thresholdViolations: violations.length,
      violationRate: violations.length / operationMetrics.length,
      meetsTarget: avgDuration <= threshold && violations.length / operationMetrics.length < 0.05, // <5% violations
      trend: this.getTrend(operation)
    };
  }

  /**
   * Get overall performance summary
   * @param {number} [timeWindow=300000] - Time window in milliseconds
   * @returns {Object} Overall performance summary
   */
  getPerformanceSummary(timeWindow = 300000) {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter(metric => metric.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        meetsTargets: true,
        operationBreakdown: {},
        recommendations: []
      };
    }

    // Group by operation
    const operationGroups = new Map();
    for (const metric of recentMetrics) {
      if (!operationGroups.has(metric.operation)) {
        operationGroups.set(metric.operation, []);
      }
      operationGroups.get(metric.operation).push(metric);
    }

    const operationBreakdown = {};
    let totalViolations = 0;
    let criticalOperations = [];

    for (const [operation] of operationGroups) {
      const stats = this.getOperationStats(operation, timeWindow);
      operationBreakdown[operation] = stats;
      
      totalViolations += stats.thresholdViolations;
      
      if (!stats.meetsTarget) {
        criticalOperations.push(operation);
      }
    }

    const allDurations = recentMetrics.map(m => m.duration);
    const successfulOps = recentMetrics.filter(m => m.success);
    const avgDuration = allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length;

    return {
      totalOperations: recentMetrics.length,
      averageDuration: avgDuration,
      successRate: successfulOps.length / recentMetrics.length,
      meetsTargets: criticalOperations.length === 0 && totalViolations < recentMetrics.length * 0.05,
      violationRate: totalViolations / recentMetrics.length,
      criticalOperations,
      operationBreakdown,
      recommendations: this.generateRecommendations(operationBreakdown, criticalOperations)
    };
  }

  /**
   * Generate performance report
   * @param {Object} [options={}] - Report options
   * @returns {PerformanceReport} Comprehensive performance report
   */
  generateReport(options = {}) {
    const {
      timeWindow = 300000,
      includeViolations = true,
      includeTrends = true,
      includeRecommendations = true
    } = options;

    const summary = this.getPerformanceSummary(timeWindow);
    const report = {
      timestamp: Date.now(),
      timeWindow,
      summary
    };

    if (includeViolations) {
      report.violations = this.getViolations(timeWindow);
    }

    if (includeTrends && this.options.enableTrendAnalysis) {
      report.trends = this.getTrendAnalysis(timeWindow);
    }

    if (includeRecommendations) {
      report.recommendations = this.generateDetailedRecommendations(summary);
    }

    this.lastReport = report;
    return report;
  }

  /**
   * Check if performance targets are being met
   * @returns {Object} Performance target assessment
   */
  assessPerformanceTargets() {
    const summary = this.getPerformanceSummary();
    
    const filterAppStats = this.getOperationStats('filterApplication');
    const meetsFilterTarget = filterAppStats.averageDuration <= this.thresholds.filterApplication;
    
    return {
      overallHealth: summary.meetsTargets ? 'GOOD' : 'POOR',
      filterApplicationTarget: {
        target: this.thresholds.filterApplication,
        actual: filterAppStats.averageDuration,
        meets: meetsFilterTarget,
        margin: this.thresholds.filterApplication - filterAppStats.averageDuration
      },
      criticalIssues: summary.criticalOperations,
      violationRate: summary.violationRate,
      recommendations: summary.recommendations.slice(0, 3) // Top 3 recommendations
    };
  }

  /**
   * Add performance alert callback
   * @param {Function} callback - Callback function for alerts
   */
  addAlertCallback(callback) {
    if (typeof callback === 'function') {
      this.alertCallbacks.add(callback);
    }
  }

  /**
   * Remove performance alert callback
   * @param {Function} callback - Callback function to remove
   */
  removeAlertCallback(callback) {
    this.alertCallbacks.delete(callback);
  }

  /**
   * Set performance baseline for comparison
   * @param {string} operation - Operation name
   * @param {number} baseline - Baseline performance in milliseconds
   */
  setBaseline(operation, baseline) {
    this.baselinePerformance.set(operation, baseline);
    console.log(`Performance baseline set for ${operation}: ${baseline}ms`);
  }

  /**
   * Reset all metrics and state
   */
  reset() {
    this.metrics = [];
    this.currentOperations.clear();
    this.operationCounters.clear();
    this.violations = [];
    this.trendData.clear();
    this.lastReport = null;
    
    console.log('FilterPerformanceMonitor reset');
  }

  /**
   * Get current monitoring status
   * @returns {Object} Monitoring status
   */
  getStatus() {
    return {
      isActive: this.reportTimer !== null,
      metricsCount: this.metrics.length,
      activeOperations: this.currentOperations.size,
      violationsCount: this.violations.length,
      lastReportTime: this.lastReport?.timestamp || null,
      thresholds: this.thresholds
    };
  }

  /**
   * Destroy monitor and cleanup resources
   */
  destroy() {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    
    this.reset();
    this.alertCallbacks.clear();
    
    console.log('FilterPerformanceMonitor destroyed');
  }

  // ========== Private Methods ==========

  /**
   * Start automatic reporting
   * @private
   */
  startReporting() {
    this.reportTimer = setInterval(() => {
      const report = this.generateReport();
      this.logPerformanceReport(report);
    }, this.options.reportingInterval);
  }

  /**
   * Generate unique measurement ID
   * @param {string} operation - Operation name
   * @returns {string} Measurement ID
   * @private
   */
  generateMeasurementId(operation) {
    const timestamp = Date.now();
    const counter = this.operationCounters.get(operation) || 0;
    return `${operation}_${timestamp}_${counter}`;
  }

  /**
   * Get threshold for operation
   * @param {string} operation - Operation name
   * @returns {number} Threshold in milliseconds
   * @private
   */
  getThreshold(operation) {
    // Check for specific operation threshold
    if (this.thresholds[operation]) {
      return this.thresholds[operation];
    }

    // Check for operation category
    if (operation.includes('filter')) return this.thresholds.filterApplication;
    if (operation.includes('dom')) return this.thresholds.domOperation;
    if (operation.includes('cache')) return this.thresholds.cacheOperation;
    if (operation.includes('predicate')) return this.thresholds.predicateExecution;

    // Default threshold
    return this.thresholds.filterApplication;
  }

  /**
   * Check for threshold violations
   * @param {PerformanceMetric} metric - Performance metric
   * @private
   */
  checkThresholdViolation(metric) {
    const threshold = this.getThreshold(metric.operation);
    
    if (metric.duration > threshold) {
      const violation = {
        ...metric,
        threshold,
        severity: metric.duration > threshold * this.options.alertThreshold ? 'HIGH' : 'MEDIUM'
      };

      this.violations.push(violation);

      // Maintain violations limit
      if (this.violations.length > 100) {
        this.violations.shift();
      }

      // Trigger alerts for high severity violations
      if (violation.severity === 'HIGH') {
        this.triggerAlert(violation);
      }
    }
  }

  /**
   * Update performance trends
   * @param {PerformanceMetric} metric - Performance metric
   * @private
   */
  updateTrends(metric) {
    const operation = metric.operation;
    
    if (!this.trendData.has(operation)) {
      this.trendData.set(operation, {
        durations: [],
        timestamps: [],
        movingAverage: 0
      });
    }

    const trend = this.trendData.get(operation);
    trend.durations.push(metric.duration);
    trend.timestamps.push(metric.timestamp);

    // Keep only last 50 measurements for trends
    if (trend.durations.length > 50) {
      trend.durations.shift();
      trend.timestamps.shift();
    }

    // Calculate moving average
    const recent = trend.durations.slice(-10);
    trend.movingAverage = recent.reduce((sum, d) => sum + d, 0) / recent.length;
  }

  /**
   * Get performance trend for operation
   * @param {string} operation - Operation name
   * @returns {string} Trend direction
   * @private
   */
  getTrend(operation) {
    const trend = this.trendData.get(operation);
    if (!trend || trend.durations.length < 10) {
      return 'INSUFFICIENT_DATA';
    }

    const recentAvg = trend.durations.slice(-5).reduce((sum, d) => sum + d, 0) / 5;
    const olderAvg = trend.durations.slice(-15, -10).reduce((sum, d) => sum + d, 0) / 5;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'DEGRADING';
    if (change < -0.1) return 'IMPROVING';
    return 'STABLE';
  }

  /**
   * Get violations within time window
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Array} Violations
   * @private
   */
  getViolations(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return this.violations.filter(v => v.timestamp > cutoff);
  }

  /**
   * Get trend analysis
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Object} Trend analysis
   * @private
   */
  getTrendAnalysis(timeWindow) {
    const analysis = {};
    
    for (const [operation, trend] of this.trendData) {
      const cutoff = Date.now() - timeWindow;
      const recentData = trend.timestamps
        .map((timestamp, index) => ({ timestamp, duration: trend.durations[index] }))
        .filter(data => data.timestamp > cutoff);

      if (recentData.length > 5) {
        analysis[operation] = {
          trend: this.getTrend(operation),
          movingAverage: trend.movingAverage,
          dataPoints: recentData.length,
          variance: this.calculateVariance(recentData.map(d => d.duration))
        };
      }
    }

    return analysis;
  }

  /**
   * Calculate variance
   * @param {Array<number>} values - Values array
   * @returns {number} Variance
   * @private
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Generate performance recommendations
   * @param {Object} operationBreakdown - Operation statistics
   * @param {Array} criticalOperations - Critical operations
   * @returns {Array<string>} Recommendations
   * @private
   */
  generateRecommendations(operationBreakdown, criticalOperations) {
    const recommendations = [];

    for (const operation of criticalOperations) {
      const stats = operationBreakdown[operation];
      
      if (operation.includes('filter')) {
        recommendations.push(`Optimize filter logic: ${operation} averaging ${stats.averageDuration.toFixed(2)}ms`);
      }
      
      if (operation.includes('dom')) {
        recommendations.push(`Reduce DOM operations: ${operation} may benefit from batching`);
      }
      
      if (operation.includes('cache')) {
        recommendations.push(`Improve caching strategy: ${operation} cache operations are slow`);
      }
    }

    return recommendations;
  }

  /**
   * Generate detailed recommendations
   * @param {Object} summary - Performance summary
   * @returns {Object} Detailed recommendations
   * @private
   */
  generateDetailedRecommendations(summary) {
    const recommendations = {
      immediate: [],
      strategic: [],
      monitoring: []
    };

    if (summary.violationRate > 0.1) {
      recommendations.immediate.push('High violation rate detected - review filter algorithms');
    }

    if (summary.averageDuration > this.thresholds.filterApplication * 0.8) {
      recommendations.immediate.push('Approaching performance threshold - implement optimizations');
    }

    for (const operation of summary.criticalOperations) {
      recommendations.strategic.push(`Long-term optimization needed for: ${operation}`);
    }

    if (this.violations.length > 10) {
      recommendations.monitoring.push('Increase monitoring frequency for performance violations');
    }

    return recommendations;
  }

  /**
   * Trigger performance alert
   * @param {Object} violation - Performance violation
   * @private
   */
  triggerAlert(violation) {
    const alert = {
      type: 'PERFORMANCE_VIOLATION',
      severity: violation.severity,
      operation: violation.operation,
      duration: violation.duration,
      threshold: violation.threshold,
      timestamp: violation.timestamp,
      message: `${violation.operation} exceeded threshold: ${violation.duration.toFixed(2)}ms > ${violation.threshold}ms`
    };

    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in performance alert callback:', error);
      }
    }
  }

  /**
   * Log performance report
   * @param {PerformanceReport} report - Performance report
   * @private
   */
  logPerformanceReport(report) {
    const { summary } = report;
    
    if (summary.meetsTargets) {
      console.log(`[Performance] ✅ All targets met (${summary.totalOperations} ops, avg: ${summary.averageDuration.toFixed(2)}ms)`);
    } else {
      console.warn(`[Performance] ⚠️ Targets missed: ${summary.criticalOperations.join(', ')}`);
    }
  }
}