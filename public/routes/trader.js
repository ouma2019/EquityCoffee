// Combined Trader Module JavaScript
class TraderManager {
  constructor() {
      this.negotiations = JSON.parse(localStorage.getItem('negotiations')) || [];
      this.contracts = JSON.parse(localStorage.getItem('contracts')) || [];
      this.shipments = JSON.parse(localStorage.getItem('shipments')) || [];
      this.partners = JSON.parse(localStorage.getItem('partners')) || [];
      
      // EquityCoffeeTrader properties
      this.currentFilters = {
          country: '',
          process: '',
          minScore: 80,
          maxScore: 90,
          priceRange: [0, 10]
      };
      this.watchedLots = new Set();
      
      this.init();
  }

  init() {
      this.initializeEventListeners();
      this.loadData();
      this.setupRealTimeUpdates();
  }

  initializeEventListeners() {
      // Negotiations page
      if (document.getElementById('newNegotiationBtn')) {
          document.getElementById('newNegotiationBtn').addEventListener('click', () => this.openNegotiationModal());
          document.getElementById('negotiationForm').addEventListener('submit', (e) => this.saveNegotiation(e));
          document.getElementById('searchNegotiations').addEventListener('input', (e) => this.filterNegotiations(e.target.value));
          document.getElementById('statusFilter').addEventListener('change', (e) => this.filterNegotiationsByStatus(e.target.value));
      }

      // Contracts page
      if (document.getElementById('newContractBtn')) {
          document.getElementById('newContractBtn').addEventListener('click', () => this.openContractModal());
      }

      // Shipments page
      if (document.getElementById('newShipmentBtn')) {
          document.getElementById('newShipmentBtn').addEventListener('click', () => this.openShipmentModal());
      }

      // Partners page
      if (document.getElementById('newPartnerBtn')) {
          document.getElementById('newPartnerBtn').addEventListener('click', () => this.openPartnerModal());
      }

      // Marketplace functionality
      this.setupMarketplaceEventListeners();
  }

  setupMarketplaceEventListeners() {
      // Filter event listeners
      const countryFilter = document.getElementById('countryFilter');
      const processFilter = document.getElementById('processFilter');
      const scoreFilter = document.getElementById('scoreFilter');
      const priceFilter = document.getElementById('priceFilter');

      if (countryFilter) {
          countryFilter.addEventListener('change', (e) => this.applyMarketplaceFilters());
      }
      if (processFilter) {
          processFilter.addEventListener('change', (e) => this.applyMarketplaceFilters());
      }
      if (scoreFilter) {
          scoreFilter.addEventListener('input', (e) => this.applyMarketplaceFilters());
      }
      if (priceFilter) {
          priceFilter.addEventListener('input', (e) => this.applyMarketplaceFilters());
      }
  }

  // Negotiations Management
  openNegotiationModal(negotiation = null) {
      const modal = document.getElementById('negotiationModal');
      const title = document.getElementById('modalTitle');
      
      if (negotiation) {
          title.textContent = 'Edit Negotiation';
          this.populateNegotiationForm(negotiation);
      } else {
          title.textContent = 'New Negotiation';
          document.getElementById('negotiationForm').reset();
      }
      
      modal.style.display = 'block';
  }

  populateNegotiationForm(negotiation) {
      document.getElementById('negotiationId').value = negotiation.id;
      document.getElementById('partnerSelect').value = negotiation.partnerId;
      document.getElementById('coffeeType').value = negotiation.coffeeType;
      document.getElementById('quantity').value = negotiation.quantity;
      document.getElementById('price').value = negotiation.price;
      document.getElementById('notes').value = negotiation.notes || '';
  }

  saveNegotiation(e) {
      e.preventDefault();
      
      const negotiation = {
          id: document.getElementById('negotiationId').value || Date.now().toString(),
          partnerId: document.getElementById('partnerSelect').value,
          coffeeType: document.getElementById('coffeeType').value,
          quantity: parseFloat(document.getElementById('quantity').value),
          price: parseFloat(document.getElementById('price').value),
          notes: document.getElementById('notes').value,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };

      const existingIndex = this.negotiations.findIndex(n => n.id === negotiation.id);
      if (existingIndex > -1) {
          this.negotiations[existingIndex] = negotiation;
      } else {
          this.negotiations.push(negotiation);
      }

      this.saveToLocalStorage();
      this.loadNegotiations();
      this.closeModal();
  }

  filterNegotiations(searchTerm) {
      const filtered = this.negotiations.filter(negotiation => 
          negotiation.coffeeType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          negotiation.partnerId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      this.displayNegotiations(filtered);
  }

  filterNegotiationsByStatus(status) {
      if (!status) {
          this.displayNegotiations(this.negotiations);
          return;
      }
      const filtered = this.negotiations.filter(negotiation => negotiation.status === status);
      this.displayNegotiations(filtered);
  }

  // Data Loading and Display
  loadData() {
      if (document.getElementById('negotiationsBody')) {
          this.loadNegotiations();
      }
      if (document.getElementById('contractsBody')) {
          this.loadContracts();
      }
      if (document.getElementById('shipmentsBody')) {
          this.loadShipments();
      }
      if (document.getElementById('partnersBody')) {
          this.loadPartners();
      }
      if (document.getElementById('marketplace-lots')) {
          this.loadMarketplaceData();
      }
  }

  loadNegotiations() {
      this.displayNegotiations(this.negotiations);
  }

  displayNegotiations(negotiations) {
      const tbody = document.getElementById('negotiationsBody');
      if (!tbody) return;

      tbody.innerHTML = negotiations.map(negotiation => `
          <tr>
              <td>${negotiation.id}</td>
              <td>${this.getPartnerName(negotiation.partnerId)}</td>
              <td>${negotiation.coffeeType}</td>
              <td>${negotiation.quantity} kg</td>
              <td>$${negotiation.price}/kg</td>
              <td><span class="status-badge status-${negotiation.status}">${negotiation.status}</span></td>
              <td>${new Date(negotiation.updatedAt).toLocaleDateString()}</td>
              <td>
                  <button onclick="traderManager.openNegotiationModal(${JSON.stringify(negotiation).replace(/"/g, '&quot;')})" class="btn-edit">Edit</button>
                  <button onclick="traderManager.deleteNegotiation('${negotiation.id}')" class="btn-delete">Delete</button>
              </td>
          </tr>
      `).join('');
  }

  getPartnerName(partnerId) {
      const partner = this.partners.find(p => p.id === partnerId);
      return partner ? partner.name : partnerId;
  }

  deleteNegotiation(id) {
      if (confirm('Are you sure you want to delete this negotiation?')) {
          this.negotiations = this.negotiations.filter(n => n.id !== id);
          this.saveToLocalStorage();
          this.loadNegotiations();
      }
  }

  closeModal() {
      document.getElementById('negotiationModal').style.display = 'none';
  }

  saveToLocalStorage() {
      localStorage.setItem('negotiations', JSON.stringify(this.negotiations));
      localStorage.setItem('contracts', JSON.stringify(this.contracts));
      localStorage.setItem('shipments', JSON.stringify(this.shipments));
      localStorage.setItem('partners', JSON.stringify(this.partners));
  }

  // Marketplace Methods from EquityCoffeeTrader
  async loadMarketplaceData(filters = {}) {
      try {
          this.showLoadingState('marketplace', true);
          
          const response = await this.apiCall('/api/trader/marketplace', {
              method: 'POST',
              body: JSON.stringify(filters)
          });
          
          const data = await response.json();
          
          if (response.ok) {
              this.renderMarketplaceLots(data.lots);
              this.updateMarketplaceStats(data.stats);
          } else {
              throw new Error(data.error);
          }
          
      } catch (error) {
          this.showNotification(`Failed to load marketplace: ${error.message}`, 'error');
      } finally {
          this.showLoadingState('marketplace', false);
      }
  }

  renderMarketplaceLots(lots) {
      const container = document.getElementById('marketplace-lots');
      if (!container) return;

      container.innerHTML = lots.map(lot => `
          <div class="lot-card ${this.watchedLots.has(lot.id) ? 'watched' : ''}" data-lot-id="${lot.id}">
              <div class="lot-header">
                  <h3>${this.escapeHtml(lot.name)}</h3>
                  <span class="lot-origin">${this.escapeHtml(lot.country)} • ${this.escapeHtml(lot.region)}</span>
              </div>
              
              <div class="lot-meta">
                  <span class="meta-item">
                      <i class="fas fa-seedling"></i>
                      ${this.escapeHtml(lot.variety)} / ${this.escapeHtml(lot.process)}
                  </span>
                  <span class="meta-item">
                      <i class="fas fa-star"></i>
                      ${lot.cup_score || 'N/A'} cupping score
                  </span>
              </div>

              <div class="lot-details">
                  <div class="detail-row">
                      <span class="label">Quantity:</span>
                      <span class="value">${lot.quantity_bags} bags</span>
                  </div>
                  <div class="detail-row">
                      <span class="label">Price:</span>
                      <span class="value price">$${lot.price_per_kg}/kg</span>
                  </div>
                  <div class="detail-row">
                      <span class="label">Location:</span>
                      <span class="value">${this.escapeHtml(lot.ready_location)}</span>
                  </div>
              </div>

              <div class="lot-actions">
                  <button class="btn btn-ghost watch-lot" data-lot-id="${lot.id}">
                      <i class="fas ${this.watchedLots.has(lot.id) ? 'fa-eye-slash' : 'fa-eye'}"></i>
                      ${this.watchedLots.has(lot.id) ? 'Unwatch' : 'Watch'}
                  </button>
                  <button class="btn btn-primary make-offer" data-lot-id="${lot.id}">
                      <i class="fas fa-handshake"></i>
                      Make Offer
                  </button>
              </div>

              ${lot.certifications && lot.certifications.length > 0 ? `
                  <div class="certifications">
                      ${lot.certifications.map(cert => `
                          <span class="cert-badge">${this.escapeHtml(cert)}</span>
                      `).join('')}
                  </div>
              ` : ''}
          </div>
      `).join('');

      // Reattach event listeners
      this.attachLotEventListeners();
  }

  attachLotEventListeners() {
      // Watch/unwatch functionality
      document.querySelectorAll('.watch-lot').forEach(button => {
          button.addEventListener('click', async (e) => {
              const lotId = e.target.closest('.watch-lot').dataset.lotId;
              await this.toggleWatchLot(lotId);
          });
      });

      // Make offer functionality
      document.querySelectorAll('.make-offer').forEach(button => {
          button.addEventListener('click', (e) => {
              const lotId = e.target.closest('.make-offer').dataset.lotId;
              this.openOfferModal(lotId);
          });
      });
  }

  async toggleWatchLot(lotId) {
      try {
          const response = await this.apiCall(`/api/trader/lots/${lotId}/watch`, {
              method: 'POST'
          });

          if (response.ok) {
              if (this.watchedLots.has(lotId)) {
                  this.watchedLots.delete(lotId);
                  this.showNotification('Lot removed from watchlist', 'success');
              } else {
                  this.watchedLots.add(lotId);
                  this.showNotification('Lot added to watchlist', 'success');
              }
              
              // Update UI
              this.renderMarketplaceLots(await this.getCurrentLots());
          }
      } catch (error) {
          this.showNotification('Failed to update watchlist', 'error');
      }
  }

  openOfferModal(lotId) {
      const modal = document.getElementById('offer-modal');
      if (modal) {
          modal.style.display = 'block';
          this.populateOfferModal(lotId);
      }
  }

  populateOfferModal(lotId) {
      // Implementation for populating offer modal
      console.log('Populating offer modal for lot:', lotId);
  }

  applyMarketplaceFilters() {
      const filters = {
          country: document.getElementById('countryFilter')?.value || '',
          process: document.getElementById('processFilter')?.value || '',
          minScore: document.getElementById('scoreFilter')?.value || 80,
          priceRange: [0, document.getElementById('priceFilter')?.value || 10]
      };
      this.loadMarketplaceData(filters);
  }

  updateMarketplaceStats(stats) {
      // Update marketplace statistics in the UI
      const statsElement = document.getElementById('marketplace-stats');
      if (statsElement && stats) {
          statsElement.innerHTML = `
              <div class="stat-item">
                  <span class="stat-value">${stats.totalLots || 0}</span>
                  <span class="stat-label">Total Lots</span>
              </div>
              <div class="stat-item">
                  <span class="stat-value">${stats.avgPrice || 0}</span>
                  <span class="stat-label">Avg Price/kg</span>
              </div>
          `;
      }
  }

  setupRealTimeUpdates() {
      // Setup WebSocket or polling for real-time updates
      // This is a placeholder for real-time functionality
      setInterval(() => {
          this.loadMarketplaceData();
      }, 30000); // Refresh every 30 seconds
  }

  showLoadingState(elementId, show) {
      const element = document.getElementById(elementId);
      if (element) {
          if (show) {
              element.classList.add('loading');
          } else {
              element.classList.remove('loading');
          }
      }
  }

  showNotification(message, type = 'info') {
      // Simple notification implementation
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
          notification.remove();
      }, 3000);
  }

  // Utility methods
  escapeHtml(unsafe) {
      if (!unsafe) return '';
      return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
  }

  async apiCall(endpoint, options = {}) {
      const token = localStorage.getItem('authToken');
      
      const config = {
          headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` })
          },
          ...options
      };

      if (config.body && typeof config.body === 'object') {
          config.body = JSON.stringify(config.body);
      }

      return fetch(endpoint, config);
  }

  async getCurrentLots() {
      // Mock implementation - replace with actual API call
      return [];
  }
}

// Initialize Trader Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.traderManager = new TraderManager();
});