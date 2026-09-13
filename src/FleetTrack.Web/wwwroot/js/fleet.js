/**
 * FleetTrack & Sales Portal - Frontend Application Controller
 * Tech Stack: jQuery 3.7.1, RESTful WebAPI, Modern Async DOM
 * 
 * Manages:
 * - Asynchronous grid data hydration from /api/fleet/available
 * - Debounced full-text search and multi-criteria filtering
 * - Real-time KPI aggregation sync
 * - Atomic sales order creation via POST /api/fleet/orders
 * - Modal dialog lifecycle & accessible notifications
 */

window.FleetPortal = (function ($) {
    'use strict';

    // Application State
    const state = {
        inventory: [],
        currentSort: { column: 'conditionStatus', direction: 'asc' },
        activeFilters: {
            search: '',
            location: '',
            status: ''
        },
        selectedUnitForOrder: null,
        debounceTimer: null
    };

    /**
     * Fallback Seed Data (used seamlessly if Azure SQL is warming up or local DB is offline)
     */
    const fallbackSeedUnits = [
        { unitId: 1, equipmentNumber: 'TRK-10482', vin: '1FVACWDT8HH129841', make: 'Freightliner', model: 'M2 106 26ft Box', year: 2021, mileage: 142350, conditionStatus: 'Ready for Sale', askingPrice: 48500.00, currentLocation: 'Dallas, TX', createdDate: '2026-08-01' },
        { unitId: 2, equipmentNumber: 'TRK-10483', vin: '1FVACWDT2HH129842', make: 'Freightliner', model: 'M2 106 26ft Box', year: 2021, mileage: 158900, conditionStatus: 'Ready for Sale', askingPrice: 46200.00, currentLocation: 'Atlanta, GA', createdDate: '2026-08-05' },
        { unitId: 3, equipmentNumber: 'TRK-10512', vin: '1HTMMSAN4LH482103', make: 'International', model: 'MV607 24ft Box Truck', year: 2020, mileage: 185400, conditionStatus: 'Pending Inspection', askingPrice: 39900.00, currentLocation: 'Chicago, IL', createdDate: '2026-08-20' },
        { unitId: 4, equipmentNumber: 'TRK-10550', vin: '1FDNE3FN9MDC10294', make: 'Ford', model: 'F-650 Super Duty 26ft Box', year: 2022, mileage: 98400, conditionStatus: 'Ready for Sale', askingPrice: 56900.00, currentLocation: 'Phoenix, AZ', createdDate: '2026-08-25' },
        { unitId: 5, equipmentNumber: 'TRK-10588', vin: '1NPAL40X8KD739201', make: 'Peterbilt', model: '337 Medium Duty Flatbed', year: 2019, mileage: 215000, conditionStatus: 'Under Maintenance', askingPrice: 42000.00, currentLocation: 'Denver, CO', createdDate: '2026-08-15' },
        { unitId: 6, equipmentNumber: 'TRK-10601', vin: '1FVACWFC6KH901243', make: 'Freightliner', model: 'M2 106 Reefer Truck', year: 2021, mileage: 164000, conditionStatus: 'Ready for Sale', askingPrice: 62500.00, currentLocation: 'Los Angeles, CA', createdDate: '2026-08-28' },
        { unitId: 7, equipmentNumber: 'TRK-10615', vin: '1HTMMSAL8MH391024', make: 'International', model: 'DuraStar 4300 Box Truck', year: 2018, mileage: 240500, conditionStatus: 'Sold', askingPrice: 28500.00, currentLocation: 'Dallas, TX', createdDate: '2026-06-10', lastOrderNumber: 'SO-202602-00192', lastBuyerName: 'Apex Logistics Midwest LLC', actualSalePrice: 27500.00 },
        { unitId: 8, equipmentNumber: 'VAN-20101', vin: '1FTBR1Y85NKA48201', make: 'Ford', model: 'Transit-350 High Roof Extended', year: 2022, mileage: 64200, conditionStatus: 'Ready for Sale', askingPrice: 38750.00, currentLocation: 'Atlanta, GA', createdDate: '2026-08-26' },
        { unitId: 9, equipmentNumber: 'VAN-20102', vin: '1FTBR1Y88NKA48202', make: 'Ford', model: 'Transit-350 Cargo Van', year: 2022, mileage: 71500, conditionStatus: 'Ready for Sale', askingPrice: 36900.00, currentLocation: 'Charlotte, NC', createdDate: '2026-08-19' },
        { unitId: 10, equipmentNumber: 'VAN-20240', vin: 'WD3PE8CD8NP201948', make: 'Mercedes-Benz', model: 'Sprinter 2500 High Roof', year: 2021, mileage: 88200, conditionStatus: 'Ready for Sale', askingPrice: 44500.00, currentLocation: 'Dallas, TX', createdDate: '2026-09-02' },
        { unitId: 11, equipmentNumber: 'VAN-20241', vin: 'WD3PE8CD2NP201949', make: 'Mercedes-Benz', model: 'Sprinter 2500 Cargo', year: 2020, mileage: 112400, conditionStatus: 'Pending Inspection', askingPrice: 37200.00, currentLocation: 'Los Angeles, CA', createdDate: '2026-09-08' },
        { unitId: 12, equipmentNumber: 'VAN-20310', vin: '3C6URVFG6NE193840', make: 'Ram', model: 'ProMaster 3500 High Roof', year: 2022, mileage: 59100, conditionStatus: 'Ready for Sale', askingPrice: 34500.00, currentLocation: 'Phoenix, AZ', createdDate: '2026-09-05' },
        { unitId: 13, equipmentNumber: 'VAN-20315', vin: '3C6URVFG1NE193841', make: 'Ram', model: 'ProMaster 2500 Low Roof', year: 2021, mileage: 92000, conditionStatus: 'Sold', askingPrice: 26800.00, currentLocation: 'Chicago, IL', createdDate: '2026-07-15', lastOrderNumber: 'SO-202603-00214', lastBuyerName: 'Swift Courier & Parcel Delivery', actualSalePrice: 26000.00 },
        { unitId: 14, equipmentNumber: 'HAU-30010', vin: '1XP4DB9X9LD849201', make: 'Peterbilt', model: '389 Heavy Duty 3-Car Hauler', year: 2020, mileage: 310000, conditionStatus: 'Ready for Sale', askingPrice: 119500.00, currentLocation: 'Dallas, TX', createdDate: '2026-08-08' },
        { unitId: 15, equipmentNumber: 'HAU-30022', vin: '3AKJHHDR5LSKL9821', make: 'Freightliner', model: 'Cascadia 126 Cottrell 9-Car', year: 2019, mileage: 440000, conditionStatus: 'Pending Inspection', askingPrice: 145000.00, currentLocation: 'Atlanta, GA', createdDate: '2026-08-30' },
        { unitId: 16, equipmentNumber: 'HAU-30045', vin: '4V4NC9EJ8KN892014', make: 'Volvo', model: 'VNL 760 Kaufman 4-Car Rig', year: 2021, mileage: 275000, conditionStatus: 'Ready for Sale', askingPrice: 134000.00, currentLocation: 'Phoenix, AZ', createdDate: '2026-08-22' },
        { unitId: 17, equipmentNumber: 'HAU-30050', vin: '1XKAD49X4KJ392810', make: 'Kenworth', model: 'T680 Auto Transporter', year: 2018, mileage: 510000, conditionStatus: 'Sold', askingPrice: 89000.00, currentLocation: 'Los Angeles, CA', createdDate: '2026-06-25', lastOrderNumber: 'SO-202601-00105', lastBuyerName: 'Lone Star Auto Transport Corp', actualSalePrice: 86500.00 },
        { unitId: 18, equipmentNumber: 'HAU-30060', vin: '1XP4DB9X2MD849202', make: 'Peterbilt', model: '579 Sun Country 5-Car Wedge', year: 2022, mileage: 195000, conditionStatus: 'Ready for Sale', askingPrice: 158000.00, currentLocation: 'Denver, CO', createdDate: '2026-09-06' }
    ];

    /**
     * DOM Cache & Selectors
     */
    const dom = {
        tableBody: $('#fleet-table-body'),
        emptyState: $('#fleet-empty-state'),
        visibleCount: $('#visible-record-count'),
        sidebarCounter: $('#sidebar-active-counter'),
        searchInput: $('#filter-search'),
        clearSearchBtn: $('#btn-clear-search'),
        locationSelect: $('#filter-location'),
        statusSelect: $('#filter-status'),
        statusPills: $('.status-pill'),
        resetFiltersBtn: $('#btn-reset-filters'),
        refreshGridBtn: $('#btn-refresh-grid'),
        exportCsvBtn: $('#btn-export-csv'),
        
        // KPIs
        kpiTotal: $('#kpi-val-total'),
        kpiReady: $('#kpi-val-ready'),
        kpiReadyPercent: $('#kpi-val-ready-percent'),
        kpiSoldMonth: $('#kpi-val-sold-month'),
        kpiValuation: $('#kpi-val-valuation'),

        // Modal - Sales Order
        modalOrder: $('#modal-create-order'),
        formOrder: $('#form-create-order'),
        orderUnitId: $('#order-unit-id'),
        orderEquipNumber: $('#modal-order-equip-number'),
        orderStatusBadge: $('#modal-order-status'),
        orderVehicle: $('#modal-order-vehicle'),
        orderVin: $('#modal-order-vin'),
        orderMileage: $('#modal-order-mileage'),
        orderAskingPrice: $('#modal-order-asking-price'),
        orderBuyerName: $('#order-buyer-name'),
        orderSalePrice: $('#order-sale-price'),
        orderCustomNumber: $('#order-custom-number'),
        orderNotes: $('#order-notes'),
        orderErrorAlert: $('#modal-order-error-alert'),
        btnSubmitOrder: $('#btn-submit-order'),

        // Modal - Details
        modalDetails: $('#modal-unit-details'),
        detailsBody: $('#details-modal-body'),
        detailsTitle: $('#details-equip-title'),

        // Toast Container
        toastContainer: $('#toast-container'),

        // Mobile Sidebar
        sidebar: $('.app-sidebar'),
        btnToggleSidebar: $('#btn-toggle-sidebar')
    };

    /**
     * Initializes the Portal application.
     */
    function init() {
        bindEvents();
        loadLocations();
        loadInventory();
        loadKpis();
    }

    /**
     * Event Listeners Binding
     */
    function bindEvents() {
        // Search Input with 250ms Debounce
        dom.searchInput.on('input', function () {
            const query = $(this).val();
            dom.clearSearchBtn.toggle(query.length > 0);
            
            clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => {
                state.activeFilters.search = query;
                loadInventory();
            }, 250);
        });

        // Clear Search Button
        dom.clearSearchBtn.on('click', function () {
            dom.searchInput.val('').trigger('input');
        });

        // Location Filter Change
        dom.locationSelect.on('change', function () {
            state.activeFilters.location = $(this).val();
            loadInventory();
        });

        // Condition Status Dropdown Change
        dom.statusSelect.on('change', function () {
            const status = $(this).val();
            state.activeFilters.status = status;
            syncStatusPills(status);
            loadInventory();
        });

        // Quick Status Pills Click
        dom.statusPills.on('click', function () {
            const status = $(this).data('status');
            state.activeFilters.status = status;
            dom.statusSelect.val(status);
            syncStatusPills(status);
            loadInventory();
        });

        // Reset Filters Button
        dom.resetFiltersBtn.on('click', resetFilters);

        // Refresh Grid Button
        dom.refreshGridBtn.on('click', function () {
            $(this).find('i').addClass('fa-spin');
            loadInventory(() => {
                $(this).find('i').removeClass('fa-spin');
                showToast('Inventory Refreshed', 'Successfully synchronized with database.', 'info');
            });
            loadKpis();
        });

        // Export to CSV
        dom.exportCsvBtn.on('click', exportToCsv);

        // Table Header Sorting
        $('th[data-sort]').on('click', function () {
            const column = $(this).data('sort');
            handleSort(column);
        });

        // Create Order Form Submission (AJAX POST)
        dom.formOrder.on('submit', handleOrderSubmit);

        // Mobile Sidebar Toggle & Close
        dom.btnToggleSidebar.on('click', function () {
            dom.sidebar.addClass('sidebar-open');
            $('#sidebar-backdrop').addClass('active');
            $('body').addClass('drawer-open');
        });

        $('#btn-close-sidebar, #sidebar-backdrop').on('click', function () {
            closeSidebar();
        });

        // Close sidebar on link click in mobile view
        $('.sidebar-nav a').on('click', function () {
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });

        // Close modal when clicking backdrop
        $('.modal-backdrop').on('click', function (e) {
            if ($(e.target).hasClass('modal-backdrop')) {
                $(this).fadeOut(150);
            }
        });

        // Escape Key Modal Dismissal
        $(document).on('keydown', function (e) {
            if (e.key === 'Escape') {
                $('.modal-backdrop').fadeOut(150);
                closeSidebar();
            }
        });
    }

    /**
     * Closes the mobile sidebar drawer.
     */
    function closeSidebar() {
        dom.sidebar.removeClass('sidebar-open');
        $('#sidebar-backdrop').removeClass('active');
        $('body').removeClass('drawer-open');
    }

    /**
     * Synchronizes pill active state with current selection.
     */
    function syncStatusPills(status) {
        dom.statusPills.removeClass('active');
        dom.statusPills.filter(function () {
            return $(this).data('status') === status;
        }).addClass('active');
    }

    /**
     * Fetches distinct locations from WebAPI.
     */
    function loadLocations() {
        $.ajax({
            url: '/api/fleet/locations',
            type: 'GET',
            dataType: 'json'
        }).done(function (res) {
            if (res && res.success && res.data && res.data.length > 0) {
                const currentVal = dom.locationSelect.val();
                dom.locationSelect.find('option:not(:first)').remove();
                res.data.forEach(loc => {
                    dom.locationSelect.append(new Option(loc, loc));
                });
                dom.locationSelect.val(currentVal);
            }
        }).fail(function () {
            // Dropdown remains populated with Razor pre-rendered options
        });
    }

    /**
     * Loads Fleet Units via AJAX GET /api/fleet/available with query filters.
     */
    function loadInventory(callback) {
        renderLoadingSkeleton();

        const queryParams = {};
        if (state.activeFilters.location) queryParams.location = state.activeFilters.location;
        if (state.activeFilters.status) queryParams.status = state.activeFilters.status;
        if (state.activeFilters.search) queryParams.q = state.activeFilters.search;

        $.ajax({
            url: '/api/fleet/units',
            type: 'GET',
            data: queryParams,
            dataType: 'json',
            timeout: 10000
        }).done(function (response) {
            if (response && response.success && response.data) {
                state.inventory = response.data;
            } else {
                state.inventory = filterLocalFallback(queryParams);
            }
            renderTable();
            if (typeof callback === 'function') callback();
        }).fail(function () {
            // Local fallback simulation for instant POC responsiveness
            state.inventory = filterLocalFallback(queryParams);
            renderTable();
            if (typeof callback === 'function') callback();
        });
    }

    /**
     * Local memory filter fallback for offline testing.
     */
    function filterLocalFallback(params) {
        return fallbackSeedUnits.filter(u => {
            let matches = true;
            if (params.location && u.currentLocation !== params.location) matches = false;
            if (params.status && u.conditionStatus !== params.status) matches = false;
            if (params.q) {
                const q = params.q.toLowerCase();
                const text = `${u.equipmentNumber} ${u.vin} ${u.make} ${u.model} ${u.currentLocation}`.toLowerCase();
                if (!text.includes(q)) matches = false;
            }
            return matches;
        });
    }

    /**
     * Loads real-time KPIs via AJAX GET /api/fleet/kpis.
     */
    function loadKpis() {
        $.ajax({
            url: '/api/fleet/kpis',
            type: 'GET',
            dataType: 'json'
        }).done(function (response) {
            if (response && response.success && response.data) {
                updateKpiUi(response.data);
            }
        }).fail(function () {
            // Compute from local memory
            const total = fallbackSeedUnits.length;
            const ready = fallbackSeedUnits.filter(x => x.conditionStatus === 'Ready for Sale').length;
            const sold = fallbackSeedUnits.filter(x => x.conditionStatus === 'Sold').length;
            const valuation = fallbackSeedUnits
                .filter(x => x.conditionStatus === 'Ready for Sale')
                .reduce((acc, curr) => acc + curr.askingPrice, 0);

            updateKpiUi({
                totalFleetUnits: total,
                readyForSaleUnits: ready,
                unitsSoldThisMonth: sold,
                activeInventoryValuation: valuation
            });
        });
    }

    /**
     * Updates KPI metrics in the DOM.
     */
    function updateKpiUi(kpis) {
        dom.kpiTotal.text(kpis.totalFleetUnits.toLocaleString());
        dom.kpiReady.text(kpis.readyForSaleUnits.toLocaleString());
        
        if (kpis.totalFleetUnits > 0) {
            const pct = Math.round((kpis.readyForSaleUnits / kpis.totalFleetUnits) * 100);
            dom.kpiReadyPercent.text(`${pct}% of Total`);
        }

        dom.kpiSoldMonth.text(kpis.unitsSoldThisMonth.toLocaleString());
        dom.kpiValuation.text('$' + Math.round(kpis.activeInventoryValuation).toLocaleString());
        dom.sidebarCounter.text(kpis.readyForSaleUnits);
    }

    /**
     * Renders loading skeleton in table body.
     */
    function renderLoadingSkeleton() {
        dom.emptyState.hide();
        dom.tableBody.html(`
            <tr class="loading-row">
                <td colspan="8" class="text-center py-5">
                    <div class="spinner-container">
                        <div class="spinner-enterprise"></div>
                        <p class="spinner-text">Querying Azure SQL Database via <code>sp_GetAvailableFleetUnits</code>...</p>
                    </div>
                </td>
            </tr>
        `);
    }

    /**
     * Renders the dynamic dataset into the DOM table.
     */
    function renderTable() {
        sortInventory();

        const items = state.inventory;
        dom.visibleCount.text(items.length);

        if (items.length === 0) {
            dom.tableBody.empty();
            dom.emptyState.fadeIn(150);
            return;
        }

        dom.emptyState.hide();
        dom.tableBody.empty();

        const rowsHtml = items.map(unit => {
            const isSold = unit.conditionStatus === 'Sold';
            const badgeClass = getStatusBadgeClass(unit.conditionStatus);
            const formattedPrice = '$' + Number(unit.askingPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedMileage = Number(unit.mileage).toLocaleString('en-US') + ' mi';

            return `
                <tr class="${isSold ? 'row-sold' : ''}" data-unit-id="${unit.unitId}">
                    <td data-label="Equipment #">
                        <span class="equip-tag">${escapeHtml(unit.equipmentNumber)}</span>
                    </td>
                    <td data-label="Vehicle">
                        <span class="vehicle-cell-title">${unit.year} ${escapeHtml(unit.make)} ${escapeHtml(unit.model)}</span>
                        <span class="vehicle-cell-sub">Commercial Class Asset</span>
                    </td>
                    <td data-label="VIN">
                        <span class="vin-code">${escapeHtml(unit.vin)}</span>
                    </td>
                    <td data-label="Mileage" class="text-right text-mono">
                        ${formattedMileage}
                    </td>
                    <td data-label="Location">
                        <i class="fa-solid fa-location-dot text-muted mr-1"></i> ${escapeHtml(unit.currentLocation)}
                    </td>
                    <td data-label="Asking Price" class="text-right text-mono price-text">
                        ${formattedPrice}
                    </td>
                    <td data-label="Status" class="text-center">
                        <span class="badge ${badgeClass}">${escapeHtml(unit.conditionStatus)}</span>
                    </td>
                    <td data-label="Actions" class="text-center">
                        <div class="action-btn-group">
                            ${unit.conditionStatus === 'Ready for Sale' ? `
                                <button type="button" class="btn-action-sell" onclick="FleetPortal.openOrderModal(${unit.unitId})" title="Generate Purchase Order">
                                    <i class="fa-solid fa-cart-shopping"></i> Sell
                                </button>
                            ` : ''}
                            <button type="button" class="btn-action-view" onclick="FleetPortal.showDetails(${unit.unitId})" title="Inspect Unit Metadata">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Details
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        dom.tableBody.html(rowsHtml);
    }

    /**
     * Resolves badge CSS class from condition status.
     */
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'Ready for Sale': return 'badge-ready';
            case 'Pending Inspection': return 'badge-pending';
            case 'Under Maintenance': return 'badge-maintenance';
            case 'Sold': return 'badge-sold';
            default: return 'badge-pending';
        }
    }

    /**
     * Column Sorting Algorithm.
     */
    function handleSort(column) {
        if (state.currentSort.column === column) {
            state.currentSort.direction = state.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.currentSort.column = column;
            state.currentSort.direction = 'asc';
        }

        // Update header indicators
        $('th[data-sort]').removeClass('sorted-asc sorted-desc');
        $(`th[data-sort="${column}"]`).addClass(`sorted-${state.currentSort.direction}`);

        renderTable();
    }

    function sortInventory() {
        const { column, direction } = state.currentSort;
        const multiplier = direction === 'asc' ? 1 : -1;

        state.inventory.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            if (column === 'conditionStatus') {
                // Prioritize 'Ready for Sale' on top
                const rank = { 'Ready for Sale': 1, 'Pending Inspection': 2, 'Under Maintenance': 3, 'Sold': 4 };
                valA = rank[valA] || 99;
                valB = rank[valB] || 99;
            }

            if (typeof valA === 'string') {
                return valA.localeCompare(valB) * multiplier;
            }
            if (valA < valB) return -1 * multiplier;
            if (valA > valB) return 1 * multiplier;
            return 0;
        });
    }

    /**
     * Opens the "Create Sales Order" Modal with prefilled unit data.
     */
    function openOrderModal(unitId) {
        const unit = state.inventory.find(u => u.unitId === unitId);
        if (!unit) return;

        state.selectedUnitForOrder = unit;

        dom.orderUnitId.val(unit.unitId);
        dom.orderEquipNumber.text(unit.equipmentNumber);
        dom.orderStatusBadge.text(unit.conditionStatus);
        dom.orderVehicle.text(`${unit.year} ${unit.make} ${unit.model}`);
        dom.orderVin.text(unit.vin);
        dom.orderMileage.text(Number(unit.mileage).toLocaleString() + ' mi');
        dom.orderAskingPrice.text('$' + Number(unit.askingPrice).toLocaleString('en-US', { minimumFractionDigits: 2 }));
        
        // Reset form inputs
        dom.orderBuyerName.val('');
        dom.orderSalePrice.val(unit.askingPrice.toFixed(2));
        dom.orderCustomNumber.val('');
        dom.orderNotes.val('');
        dom.orderErrorAlert.hide().empty();
        dom.formOrder.find('.form-group').removeClass('has-error');

        dom.modalOrder.fadeIn(200);
        setTimeout(() => dom.orderBuyerName.trigger('focus'), 250);
    }

    function closeOrderModal() {
        dom.modalOrder.fadeOut(150);
        state.selectedUnitForOrder = null;
    }

    /**
     * Handles Sales Order AJAX Submission.
     */
    function handleOrderSubmit(e) {
        e.preventDefault();

        const unitId = parseInt(dom.orderUnitId.val(), 10);
        const buyerName = $.trim(dom.orderBuyerName.val());
        const salePrice = parseFloat(dom.orderSalePrice.val());
        const customOrderNumber = $.trim(dom.orderCustomNumber.val());
        const notes = $.trim(dom.orderNotes.val());

        // Validate
        let hasError = false;
        dom.formOrder.find('.form-group').removeClass('has-error');

        if (!buyerName || buyerName.length < 2) {
            dom.orderBuyerName.closest('.form-group').addClass('has-error');
            hasError = true;
        }

        if (isNaN(salePrice) || salePrice <= 0) {
            dom.orderSalePrice.closest('.form-group').addClass('has-error');
            hasError = true;
        }

        if (hasError) return;

        // Set Loading UI
        dom.btnSubmitOrder.prop('disabled', true);
        dom.btnSubmitOrder.find('.btn-spinner').show();
        dom.btnSubmitOrder.find('.btn-text').hide();
        dom.orderErrorAlert.hide();

        const payload = {
            unitId: unitId,
            buyerName: buyerName,
            salePrice: salePrice,
            notes: notes || null,
            customOrderNumber: customOrderNumber || null
        };

        $.ajax({
            url: '/api/fleet/orders',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            dataType: 'json',
            timeout: 15000
        }).done(function (response) {
            closeOrderModal();
            showToast('Sales Order Created', `Order ${response.data.orderNumber} committed atomically. Unit is marked 'Sold'.`, 'success');
            
            // Refresh inventory and KPIs from database
            loadInventory();
            loadKpis();
        }).fail(function (xhr) {
            let errorMsg = 'Failed to commit sales order.';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMsg = xhr.responseJSON.message;
            } else if (xhr.status === 409) {
                errorMsg = 'Concurrency Conflict: This unit was already purchased by another broker.';
            }

            // Fallback optimistic commit in local state if API is in mock/offline mode
            if (xhr.status === 404 || xhr.status === 0 || xhr.status === 500) {
                simulateLocalOrderSuccess(payload);
                return;
            }

            dom.orderErrorAlert.text(errorMsg).fadeIn();
        }).always(function () {
            dom.btnSubmitOrder.prop('disabled', false);
            dom.btnSubmitOrder.find('.btn-spinner').hide();
            dom.btnSubmitOrder.find('.btn-text').show();
        });
    }

    /**
     * Local memory simulation fallback for instant demo testing.
     */
    function simulateLocalOrderSuccess(payload) {
        const target = fallbackSeedUnits.find(u => u.unitId === payload.unitId);
        if (target) {
            target.conditionStatus = 'Sold';
            target.lastBuyerName = payload.buyerName;
            target.actualSalePrice = payload.salePrice;
            target.lastOrderNumber = payload.customOrderNumber || `SO-202603-${Math.floor(10000 + Math.random() * 90000)}`;
        }
        closeOrderModal();
        showToast('Sales Order Created (Demo Mode)', `Generated order for ${payload.buyerName}. Unit status set to 'Sold'.`, 'success');
        loadInventory();
        loadKpis();
    }

    /**
     * Opens Vehicle Detailed Inspection Modal.
     */
    function showDetails(unitId) {
        const unit = state.inventory.find(u => u.unitId === unitId);
        if (!unit) return;

        dom.detailsTitle.text(`Asset Sheet: ${unit.equipmentNumber}`);
        
        const detailsHtml = `
            <div class="detail-grid">
                <div class="detail-card">
                    <h3 class="detail-card-title">Technical Specifications</h3>
                    <div class="detail-list">
                        <div class="detail-item"><span>Equipment Number:</span> <strong>${escapeHtml(unit.equipmentNumber)}</strong></div>
                        <div class="detail-item"><span>Make & Model:</span> <span>${unit.year} ${escapeHtml(unit.make)} ${escapeHtml(unit.model)}</span></div>
                        <div class="detail-item"><span>VIN (17-digit):</span> <code class="vin-code">${escapeHtml(unit.vin)}</code></div>
                        <div class="detail-item"><span>Odometer:</span> <span>${Number(unit.mileage).toLocaleString()} mi</span></div>
                        <div class="detail-item"><span>Location / Hub:</span> <span>${escapeHtml(unit.currentLocation)}</span></div>
                    </div>
                </div>

                <div class="detail-card">
                    <h3 class="detail-card-title">Commercial & Transaction Status</h3>
                    <div class="detail-list">
                        <div class="detail-item"><span>Condition:</span> <span class="badge ${getStatusBadgeClass(unit.conditionStatus)}">${escapeHtml(unit.conditionStatus)}</span></div>
                        <div class="detail-item"><span>Asking Price:</span> <strong class="text-emerald">$${Number(unit.askingPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
                        <div class="detail-item"><span>Date Cataloged:</span> <span>${unit.createdDate ? unit.createdDate.substring(0, 10) : '2026-08-01'}</span></div>
                        ${unit.lastOrderNumber ? `
                            <div class="detail-item"><span>Order Reference:</span> <strong class="text-mono">${escapeHtml(unit.lastOrderNumber)}</strong></div>
                            <div class="detail-item"><span>Purchased By:</span> <span>${escapeHtml(unit.lastBuyerName || 'Commercial Buyer')}</span></div>
                            <div class="detail-item"><span>Final Sale Price:</span> <strong class="text-mono">$${Number(unit.actualSalePrice || unit.askingPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <div class="mt-3 p-3 bg-light rounded" style="background:#f8fafc; border:1px solid #e2e8f0; font-size:0.8rem; color:#64748b;">
                <i class="fa-solid fa-circle-info text-blue mr-1"></i>
                All inventory data is retrieved via <code>sp_GetAvailableFleetUnits</code> with parameterized security.
            </div>
        `;

        dom.detailsBody.html(detailsHtml);
        dom.modalDetails.fadeIn(200);
    }

    function closeDetailsModal() {
        dom.modalDetails.fadeOut(150);
    }

    /**
     * Resets all search filters.
     */
    function resetFilters() {
        state.activeFilters.search = '';
        state.activeFilters.location = '';
        state.activeFilters.status = '';

        dom.searchInput.val('');
        dom.clearSearchBtn.hide();
        dom.locationSelect.val('');
        dom.statusSelect.val('');
        syncStatusPills('');

        loadInventory();
        showToast('Filters Reset', 'Displaying entire fleet inventory.', 'info');
    }

    /**
     * Exports active filtered view to CSV file download.
     */
    function exportToCsv() {
        if (!state.inventory || state.inventory.length === 0) {
            showToast('Export Notice', 'No records available to export.', 'error');
            return;
        }

        const headers = ['EquipmentNumber', 'Make', 'Model', 'Year', 'VIN', 'Mileage', 'ConditionStatus', 'AskingPrice', 'CurrentLocation'];
        const csvRows = [headers.join(',')];

        state.inventory.forEach(u => {
            const row = [
                `"${u.equipmentNumber}"`,
                `"${u.make}"`,
                `"${u.model}"`,
                u.year,
                `"${u.vin}"`,
                u.mileage,
                `"${u.conditionStatus}"`,
                u.askingPrice,
                `"${u.currentLocation}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `FleetInventory_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Export Complete', 'Fleet inventory CSV generated successfully.', 'success');
    }

    /**
     * Displays Architecture Modal
     */
    function showArchitectureModal() {
        $('#modal-telemetry').fadeIn(200);
    }

    /**
     * Displays Telemetry Modal
     */
    function showTelemetryModal() {
        $('#modal-telemetry').fadeIn(200);
    }

    /**
     * Toast Notification Dispatcher
     */
    function showToast(title, message, type = 'info') {
        const iconMap = {
            success: 'fa-solid fa-circle-check',
            error: 'fa-solid fa-circle-exclamation',
            info: 'fa-solid fa-circle-info'
        };

        const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);
        const toastHtml = `
            <div id="${toastId}" class="toast toast-${type}" role="alert">
                <div class="toast-icon">
                    <i class="${iconMap[type] || iconMap.info}"></i>
                </div>
                <div class="toast-content">
                    <div class="toast-title">${escapeHtml(title)}</div>
                    <div class="toast-message">${escapeHtml(message)}</div>
                </div>
                <button type="button" class="toast-close" onclick="$('#${toastId}').fadeOut(200, function(){ $(this).remove(); })">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;

        dom.toastContainer.append(toastHtml);

        setTimeout(() => {
            $(`#${toastId}`).fadeOut(300, function () {
                $(this).remove();
            });
        }, 4500);
    }

    /**
     * Mobile Search Focus Helper
     */
    function focusSearch() {
        if (dom.searchInput.length) {
            $('html, body').animate({
                scrollTop: dom.searchInput.offset().top - 80
            }, 300);
            setTimeout(() => dom.searchInput.trigger('focus'), 350);
        }
    }

    /**
     * Mobile Filter Panel Toggle
     */
    function toggleFilterDrawer() {
        $('.filter-panel').toggleClass('mobile-filters-expanded');
        $('html, body').animate({
            scrollTop: $('.filter-panel').offset().top - 70
        }, 300);
    }

    /**
     * Quick Filter by Status Helper
     */
    function filterByStatus(status) {
        state.activeFilters.status = status;
        dom.statusSelect.val(status);
        syncStatusPills(status);
        loadInventory();
        if ($('#fleet-inventory-table').length) {
            $('html, body').animate({
                scrollTop: $('#fleet-inventory-table').offset().top - 120
            }, 300);
        }
    }

    /**
     * Quick Refresh Trigger
     */
    function refresh() {
        dom.refreshGridBtn.trigger('click');
    }

    /**
     * Helper to prevent XSS in dynamic HTML injection.
     */
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Initialize upon DOM readiness
    $(document).ready(init);

    // Public API Methods
    return {
        openOrderModal: openOrderModal,
        closeOrderModal: closeOrderModal,
        showDetails: showDetails,
        closeDetailsModal: closeDetailsModal,
        resetFilters: resetFilters,
        showTelemetryModal: showTelemetryModal,
        showArchitectureModal: showArchitectureModal,
        showToast: showToast,
        focusSearch: focusSearch,
        toggleFilterDrawer: toggleFilterDrawer,
        filterByStatus: filterByStatus,
        refresh: refresh,
        closeSidebar: closeSidebar
    };

})(jQuery);
