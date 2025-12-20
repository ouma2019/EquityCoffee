/**
 * Equity Coffee - Dashboard JavaScript
 * Handles dashboard-specific functionality
 */

class EquityCoffeeDashboard {
    constructor() {
        this.sidebarOpen = false;
        this.currentView = 'overview';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setCurrentYear();
        this.initializeCharts();
        this.loadDashboardData();
        this.setupRealTimeUpdates();
    }

    /**
     * Setup dashboard event listeners
     */
    setupEventListeners() {
        this.setupSidebarToggle();
        this.setupNavigation();
        this.setupPanelInteractions();
        this.setupResponsiveHandling();
    }

    /**
     * Setup sidebar toggle for mobile
     */
    setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mainArea = document.querySelector('.dashboard-main');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleSidebar(sidebar);
            });

            // Close sidebar when clicking on main content (mobile only)
            if (mainArea) {
                mainArea.addEventListener('click', () => {
                    if (window.innerWidth <= 900 && this.sidebarOpen) {
                        this.closeSidebar(sidebar);
                    }
                });
            }

            // Close sidebar when pressing escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.sidebarOpen) {
                    this.closeSidebar(sidebar);
                }
            });
        }

        // Handle window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize(sidebar);
        }, 250));
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar(sidebar) {
        if (sidebar) {
            sidebar.classList.toggle('open');
            this.sidebarOpen = sidebar.classList.contains('open');
            
            // Update aria attributes
            const sidebarToggle = document.getElementById('sidebar-toggle');
            if (sidebarToggle) {
                sidebarToggle.setAttribute('aria-expanded', this.sidebarOpen);
            }

            // Prevent body scroll when sidebar is open on mobile
            if (window.innerWidth <= 900) {
                document.body.style.overflow = this.sidebarOpen ? 'hidden' : '';
            }
        }
    }

    /**
     * Close sidebar
     */
    closeSidebar(sidebar) {
        if (sidebar) {
            sidebar.classList.remove('open');
            this.sidebarOpen = false;
            
            const sidebarToggle = document.getElementById('sidebar-toggle');
            if (sidebarToggle) {
                sidebarToggle.setAttribute('aria-expanded', 'false');
            }

            document.body.style.overflow = '';
        }
    }

    /**
     * Handle window resize
     */
    handleResize(sidebar) {
        if (window.innerWidth > 900 && sidebar) {
            // Ensure sidebar is open on desktop
            sidebar.classList.add('open');
            this.sidebarOpen = true;
            document.body.style.overflow = '';
        } else if (window.innerWidth <= 900 && sidebar) {
            // Ensure sidebar is closed on mobile by default
            sidebar.classList.remove('open');
            this.sidebarOpen = false;
        }
    }

    /**
     * Setup dashboard navigation
     */
    setupNavigation() {
        const navLinks = document.querySelectorAll('.sidebar-link');
        const currentPath = window.location.pathname;

        navLinks.forEach(link => {
            // Set active state based on current page
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }

            link.addEventListener('click', (e) => {
                // Handle navigation
                this.handleNavigation(link, e);
            });
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.updateActiveNavState();
        });
    }

    /**
     * Handle navigation between dashboard views
     */
    handleNavigation(link, event) {
        event.preventDefault();
        
        const targetUrl = link.getAttribute('href');
        const view = link.getAttribute('data-view') || 'overview';

        // Update active state
        this.setActiveNavLink(link);

        // Close sidebar on mobile after navigation
        if (window.innerWidth <= 900) {
            const sidebar = document.querySelector('.sidebar');
            this.closeSidebar(sidebar);
        }

        // Load the requested view
        this.loadView(view, targetUrl);
    }

    /**
     * Set active navigation link
     */
    setActiveNavLink(activeLink) {
        const navLinks = document.querySelectorAll('.sidebar-link');
        navLinks.forEach(link => link.classList.remove('active'));
        activeLink.classList.add('active');
    }

    /**
     * Update active nav state based on current URL
     */
    updateActiveNavState() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.sidebar-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Load dashboard view
     */
    async loadView(view, url) {
        try {
            this.showLoadingState(true);
            
            // Update browser history
            window.history.pushState({ view }, '', url);
            
            // Update current view
            this.currentView = view;
            
            // Update page title
            document.title = this.getPageTitle(view) + ' - Equity Coffee Dashboard';
            
            // Simulate API call to load view data
            await this.simulateAPICall(500);
            
            // Update dashboard content based on view
            this.updateDashboardContent(view);
            
            // Refresh charts for the new view
            this.initializeCharts();
            
            this.showLoadingState(false);
            
        } catch (error) {
            console.error('Error loading view:', error);
            this.showLoadingState(false);
            this.showNotification('Error loading dashboard data', 'error');
        }
    }

    /**
     * Get page title for view
     */
    getPageTitle(view) {
        const titles = {
            overview: 'Overview',
            marketplace: 'Marketplace',
            inventory: 'Inventory',
            contracts: 'Contracts',
            traceability: 'Traceability',
            analytics: 'Analytics',
            settings: 'Settings'
        };
        return titles[view] || 'Dashboard';
    }

    /**
     * Update dashboard content based on current view
     */
    updateDashboardContent(view) {
        // Update main heading
        const mainHeading = document.querySelector('.topbar-left h1');
        if (mainHeading) {
            mainHeading.textContent = this.getPageTitle(view);
        }

        // Update KPI cards based on view
        this.updateKPICards(view);

        // Update panel content based on view
        this.updatePanels(view);
    }

    /**
     * Update KPI cards based on current view
     */
    updateKPICards(view) {
        const kpiCards = document.querySelectorAll('.kpi-card');
        
        // Sample data for different views
        const viewData = {
            overview: [
                { value: '$42.8K', label: 'Total Revenue', meta: '+12% from last month' },
                { value: '24', label: 'Active Listings', meta: '8 new this week' },
                { value: '156', label: 'Total Contracts', meta: '94% completion rate' }
            ],
            marketplace: [
                { value: '1.2K', label: 'Available Lots', meta: 'From 35+ origins' },
                { value: '89', label: 'New Offers', meta: '12 requiring response' },
                { value: '$18.7K', label: 'Pending Deals', meta: '5 negotiations active' }
            ],
            inventory: [
                { value: '342', label: 'Total Bags', meta: 'Across 12 lots' },
                { value: '28', label: 'Low Stock', meta: 'Needs replenishment' },
                { value: '94%', label: 'Quality Score', meta: 'Average across inventory' }
            ]
        };

        const data = viewData[view] || viewData.overview;
        
        kpiCards.forEach((card, index) => {
            if (data[index]) {
                const valueElement = card.querySelector('.kpi-value');
                const labelElement = card.querySelector('.kpi-label');
                const metaElement = card.querySelector('.kpi-meta');

                if (valueElement) valueElement.textContent = data[index].value;
                if (labelElement) labelElement.textContent = data[index].label;
                if (metaElement) metaElement.textContent = data[index].meta;
            }
        });
    }

    /**
     * Update panel content based on view
     */
    updatePanels(view) {
        // This would update various panels with view-specific content
        // For now, we'll just log the view change
        console.log('Switched to view:', view);
    }

    /**
     * Setup panel interactions (expand/collapse, refresh, etc.)
     */
    setupPanelInteractions() {
        // Panel refresh buttons
        const refreshButtons = document.querySelectorAll('.panel-actions .btn');
        
        refreshButtons.forEach(button => {
            if (button.textContent.includes('Refresh') || button.querySelector('.fa-sync')) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.refreshPanel(button.closest('.panel'));
                });
            }
        });

        // Expand/collapse functionality for panels
        const panelHeaders = document.querySelectorAll('.panel-header');
        
        panelHeaders.forEach(header => {
            header.addEventListener('dblclick', () => {
                const panel = header.closest('.panel');
                panel.classList.toggle('collapsed');
            });
        });
    }

    /**
     * Refresh individual panel data
     */
    refreshPanel(panel) {
        const refreshButton = panel.querySelector('.btn');
        
        if (refreshButton) {
            // Show loading state
            const originalHTML = refreshButton.innerHTML;
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshButton.disabled = true;

            // Simulate API call
            setTimeout(() => {
                refreshButton.innerHTML = originalHTML;
                refreshButton.disabled = false;
                
                // Show success indicator
                this.showPanelRefreshSuccess(panel);
            }, 1000);
        }
    }

    /**
     * Show visual feedback for successful panel refresh
     */
    showPanelRefreshSuccess(panel) {
        panel.style.boxShadow = '0 0 0 2px #16a34a';
        setTimeout(() => {
            panel.style.boxShadow = '';
        }, 1000);
    }

    /**
     * Initialize charts and data visualizations
     */
    initializeCharts() {
        // Initialize sales chart
        this.initializeSalesChart();
        
        // Initialize inventory chart
        this.initializeInventoryChart();
        
        // Initialize map visualization if needed
        this.initializeMapVisualization();
    }

    /**
     * Initialize sales performance chart
     */
    initializeSalesChart() {
        const chartPlaceholder = document.querySelector('.chart-placeholder');
        
        if (chartPlaceholder) {
            // In a real app, this would initialize a charting library like Chart.js
            // For now, we'll just add some demo content
            chartPlaceholder.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: #8a7967;">
                    <i class="fas fa-chart-line" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>Sales Performance Chart</div>
                    <div style="font-size: 0.75rem; margin-top: 0.25rem;">$42.8K Total Revenue</div>
                </div>
            `;
        }
    }

    /**
     * Initialize inventory chart
     */
    initializeInventoryChart() {
        // Similar implementation for inventory chart
        // This would connect to a charting library in production
    }

    /**
     * Initialize map visualization
     */
    initializeMapVisualization() {
        // Initialize geographic visualization if needed
    }

    /**
     * Load initial dashboard data
     */
    async loadDashboardData() {
        try {
            this.showLoadingState(true);
            
            // Simulate API calls for initial data
            await Promise.all([
                this.simulateAPICall(800),  // KPI data
                this.simulateAPICall(600),  // Chart data
                this.simulateAPICall(400)   // Recent activity
            ]);
            
            this.showLoadingState(false);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showLoadingState(false);
            this.showNotification('Error loading dashboard data', 'error');
        }
    }

    /**
     * Setup real-time updates for dashboard
     */
    setupRealTimeUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            this.updateRealTimeData();
        }, 30000); // Update every 30 seconds

        // Listen for real-time events (WebSocket in production)
        this.setupEventSource();
    }

    /**
     * Update real-time data
     */
    updateRealTimeData() {
        // Update KPI cards with slight variations
        const kpiValues = document.querySelectorAll('.kpi-value');
        
        kpiValues.forEach(valueElement => {
            const currentValue = valueElement.textContent;
            // Simulate small fluctuations in data
            if (currentValue.includes('$')) {
                const amount = parseFloat(currentValue.replace(/[$,]/g, ''));
                const variation = (Math.random() - 0.5) * 100;
                const newAmount = Math.max(0, amount + variation);
                valueElement.textContent = '$' + newAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                });
            }
        });
    }

    /**
     * Setup event source for real-time updates (WebSocket simulation)
     */
    setupEventSource() {
        // In production, this would set up WebSocket connection
        // For demo, we'll simulate occasional notifications
        setInterval(() => {
            if (Math.random() > 0.7) { // 30% chance
                this.showNotification('New offer received for Brazil Cerrado Lot', 'info');
            }
        }, 60000);
    }

    /**
     * Show loading state for dashboard
     */
    showLoadingState(show) {
        const loadingOverlay = document.getElementById('loading-overlay') || this.createLoadingOverlay();
        
        if (show) {
            loadingOverlay.style.display = 'flex';
            document.body.style.cursor = 'wait';
        } else {
            loadingOverlay.style.display = 'none';
            document.body.style.cursor = '';
        }
    }

    /**
     * Create loading overlay element
     */
    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            flex-direction: column;
            gap: 1rem;
        `;
        
        overlay.innerHTML = `
            <div class="loading-spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #8B4513;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <div style="color: #8B4513; font-weight: 500;">Loading Dashboard...</div>
        `;

        // Add spin animation
        if (!document.querySelector('#loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Show notification toast
     */
    showNotification(message, type = 'info') {
        // Reuse the toast functionality from main app or implement dashboard-specific
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // In a real dashboard, you might want a more integrated notification system
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        }
    }

    /**
     * Set current year in footer
     */
    setCurrentYear() {
        const yearElement = document.getElementById('year');
        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    /**
     * Handle responsive behavior
     */
    setupResponsiveHandling() {
        // Initial setup
        this.handleResize(document.querySelector('.sidebar'));
        
        // Debounced resize handler
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize(document.querySelector('.sidebar'));
        }, 250));
    }

    /**
     * Utility function to debounce rapid events
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Simulate API call with delay
     */
    simulateAPICall(delay) {
        return new Promise(resolve => {
            setTimeout(resolve, delay);
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EquityCoffeeDashboard();
});

// Make dashboard accessible globally for console debugging
window.EquityCoffeeDashboard = EquityCoffeeDashboard;