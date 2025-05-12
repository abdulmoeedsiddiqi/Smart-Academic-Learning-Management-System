/**
 * Charts and data visualization for Learning Management System
 * Requires Chart.js library: https://www.chartjs.org/
 */

// Common chart configuration
const chartColors = {
  primary: '#3b82f6',
  secondary: '#4b5563',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  light: '#f3f4f6',
  dark: '#1f2937'
};
document.addEventListener('DOMContentLoaded', function() {
  initAttendanceCharts();
  initGradeDistributionCharts();
  initCourseProgressChart();
  initActivityChart();
});


// Default options for consistent chart styling
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 12,
        padding: 15
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: 10,
      cornerRadius: 4
    }
  }
};

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initAttendanceCharts();
  initGradeDistributionCharts();
  initCourseProgressChart();
  initActivityChart();
});

// Attendance tracking charts
function initAttendanceCharts() {
  // Weekly attendance chart
  const weeklyAttendanceChart = document.getElementById('weeklyAttendanceChart');
  if (weeklyAttendanceChart) {
    new Chart(weeklyAttendanceChart, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        datasets: [{
          label: 'Attendance Rate',
          data: [95, 92, 88, 94, 90, 93, 91, 96],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: chartColors.primary,
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: chartColors.primary
        }]
      },
      options: {
        ...defaultOptions,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }
  
  // Course attendance comparison chart
  const courseAttendanceChart = document.getElementById('courseAttendanceChart');
  if (courseAttendanceChart) {
    new Chart(courseAttendanceChart, {
      type: 'bar',
      data: {
        labels: ['Mathematics', 'Physics', 'Biology', 'History', 'Literature'],
        datasets: [{
          label: 'Attendance Rate',
          data: [92, 85, 90, 88, 94],
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(139, 92, 246, 0.7)'
          ],
          borderColor: [
            chartColors.primary,
            chartColors.success,
            chartColors.warning,
            chartColors.danger,
            '#8b5cf6'
          ],
          borderWidth: 1
        }]
      },
      options: {
        ...defaultOptions,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }
}

// Grade distribution charts
function initGradeDistributionCharts() {
  // Overall grade distribution
  const gradeDistributionChart = document.getElementById('gradeDistributionChart');
  if (gradeDistributionChart) {
    new Chart(gradeDistributionChart, {
      type: 'doughnut',
      data: {
        labels: ['A (90-100%)', 'B (80-89%)', 'C (70-79%)', 'D (60-69%)', 'F (0-59%)'],
        datasets: [{
          data: [35, 30, 20, 10, 5],
          backgroundColor: [
            chartColors.success,
            chartColors.primary,
            chartColors.warning,
            '#f97316', // Orange
            chartColors.danger
          ],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        ...defaultOptions,
        cutout: '65%'
      }
    });
  }
  
  // Subject performance chart
  const subjectPerformanceChart = document.getElementById('subjectPerformanceChart');
  if (subjectPerformanceChart) {
    new Chart(subjectPerformanceChart, {
      type: 'radar',
      data: {
        labels: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'History', 'Literature'],
        datasets: [{
          label: 'Current Performance',
          data: [85, 70, 75, 90, 82, 88],
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: chartColors.primary,
          borderWidth: 2,
          pointBackgroundColor: chartColors.primary
        }, {
          label: 'Class Average',
          data: [75, 68, 70, 78, 80, 74],
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: chartColors.success,
          borderWidth: 2,
          pointBackgroundColor: chartColors.success
        }]
      },
      options: defaultOptions
    });
  }
}

// Course progress tracking chart
function initCourseProgressChart() {
  const courseProgressChart = document.getElementById('courseProgressChart');
  if (courseProgressChart) {
    new Chart(courseProgressChart, {
      type: 'bar',
      data: {
        labels: ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5'],
        datasets: [{
          label: 'Completed',
          data: [100, 100, 75, 25, 0],
          backgroundColor: chartColors.success
        }, {
          label: 'In Progress',
          data: [0, 0, 25, 50, 0],
          backgroundColor: chartColors.warning
        }, {
          label: 'Not Started',
          data: [0, 0, 0, 25, 100],
          backgroundColor: chartColors.secondary
        }]
      },
      options: {
        ...defaultOptions,
        scales: {
          x: {
            stacked: true
          },
          y: {
            stacked: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }
}

// Student activity over time chart
function initActivityChart() {
  const activityChart = document.getElementById('activityChart');
  if (activityChart) {
    new Chart(activityChart, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Hours Spent Learning',
          data: [12, 15, 18, 22, 25, 10, 5, 8, 20, 24, 28, 30],
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: chartColors.primary,
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: chartColors.primary
        }]
      },
      options: {
        ...defaultOptions,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          }
        }
      }
    });
  }
}
