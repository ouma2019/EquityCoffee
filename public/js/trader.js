document.addEventListener('DOMContentLoaded', function() {
  if (!window.ECAuth || !ECAuth.requireAuth({ redirectTo: '/login.html' })) {
    return;
  }
  var path = window.location.pathname;
  if (path.endsWith('trader-negotiations.html')) {
    initNegotiations();
  } else if (path.endsWith('trader-shipments.html')) {
    initTraderShipments();
  } else if (path.endsWith('trader-contracts.html')) {
    initTraderContracts();
  }
});

async function initNegotiations() {
  var tbody = document.querySelector('#negotiationsBody, table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8">Loading negotiations...</td></tr>';
  try {
    var data = await ECAuth.apiFetch('/api/trader/offers');
    var offers = (data && data.offers) || [];
    if (!offers.length) {
      tbody.innerHTML = '<tr><td colspan="8">No offers yet. Start by sending an offer from the marketplace.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    offers.forEach(function(of) {
      var tr = document.createElement('tr');
      var status = of.status || 'pending';
      var badgeClass = status === 'accepted' ? 'success' : (status === 'rejected' ? 'danger' : 'info');
      tr.innerHTML = `
        <td>#${of.id}</td>
        <td>Lot #${of.lot_id || '–'}</td>
        <td>${of.counterparty_type || 'Farmer'}</td>
        <td>${of.quantity_bags || '–'} bags</td>
        <td><span class="price-tag">${of.price_per_kg || 0} ${of.currency || 'USD'}/kg</span></td>
        <td><span class="badge badge-${badgeClass}">${status}</span></td>
        <td><span class="timestamp">${of.updated_at || of.created_at || ''}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon" title="View"><i class="fas fa-eye"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load offers:', err);
    tbody.innerHTML = '<tr><td colspan="8">Failed to load negotiations.</td></tr>';
  }
}

async function initTraderShipments() {
  var tbody = document.querySelector('table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8">Loading shipments...</td></tr>';
  try {
    var data = await ECAuth.apiFetch('/api/logistics/shipments');
    var list = (data && data.shipments) || [];
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8">No shipments found.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    list.forEach(function(s) {
      var tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${s.id}</strong></td>
        <td>
          <div><strong>${s.reference || ''}</strong></div>
          <div class="lot-meta">Contract #${s.contract_id || ''}</div>
        </td>
        <td>${s.origin_port || ''}</td>
        <td>${s.destination_port || ''}</td>
        <td>${s.etd || ''}</td>
        <td>${s.eta || ''}</td>
        <td><span class="badge badge-info">${s.status || 'booked'}</span></td>
        <td>
          <button class="btn-icon" title="Track"><i class="fas fa-route"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load shipments:', err);
    tbody.innerHTML = '<tr><td colspan="8">Failed to load shipments.</td></tr>';
  }
}

async function initTraderContracts() {
  var tbody = document.querySelector('table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8">Loading contracts...</td></tr>';
  try {
    var data = await ECAuth.apiFetch('/api/roaster/contracts');
    var contracts = (data && data.contracts) || [];
    if (!contracts.length) {
      tbody.innerHTML = '<tr><td colspan="8">No contracts found.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    contracts.forEach(function(c) {
      var tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${c.id}</td>
        <td>${c.farmer_id || ''}</td>
        <td>${c.quantity_bags || ''} bags @ ${c.bag_size_kg || 60}kg</td>
        <td>${c.price_per_kg || 0} ${c.currency || 'USD'}/kg</td>
        <td>${c.status || ''}</td>
        <td>${c.contract_date || ''}</td>
        <td>${c.total_value || ''}</td>
        <td><button class="btn-icon" title="View"><i class="fas fa-eye"></i></button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load contracts:', err);
    tbody.innerHTML = '<tr><td colspan="8">Failed to load contracts.</td></tr>';
  }
}
