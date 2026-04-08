const JourneyPage = (() => {
  const SESSION_GAP_MS = 30 * 60 * 1000;
  const MAX_HISTORY_RESULTS = 250;
  const RELOAD_INTERVAL_MS = 60 * 1000;
  const NODE_GAP = 159;
  const NODE_TOP = 220;
  const CONNECTOR_TOP_OFFSET = 42;
  const CONNECTOR_LEFT_OFFSET = 85;
  const CONNECTOR_WIDTH = 64;
  const BASE_STAGE_WIDTH = 1430;
  const BASE_STAGE_HEIGHT = 918;
  const NODE_RENDER_HEIGHT = 121;
  const ROW_VERTICAL_GAP = 176;
  const ROW_INDENT_STEP = 72;
  const ROW_INDENT_CYCLE = 4;
  const STAGE_HORIZONTAL_PADDING = 180;
  const STAGE_VERTICAL_PADDING = 180;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 1.8;
  const FIT_PADDING = 32;
  const ZOOM_STEP = 0.15;

  const TIMEFRAMES = [
    { label: '6H', value: '6h', hours: 6 },
    { label: '12H', value: '12h', hours: 12 },
    { label: '1D', value: '1d', hours: 24 },
    { label: '1W', value: '1w', hours: 24 * 7 },
    { label: '1M', value: '1m', hours: 24 * 30 }
  ];

  const STORAGE_KEYS = {
    timeframeValue: 'journeyTimeframeValue'
  };

  const state = {
    initialized: false,
    loading: false,
    menuOpen: false,
    activeNodeMenuId: null,
    openFilterMenu: null,
    settingsMenuOpen: false,
    preferencesLoaded: false,
    timeframeValue: '6h',
    sessions: [],
    selectedOriginId: 'all',
    originDomainFilters: [],
    endPointDomainFilters: [],
    originQuery: '',
    hideBranches: false,
    visibleNodes: [],
    lastLoadedAt: 0,
    panX: 0,
    panY: 0,
    scale: 1,
    dragPointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0
  };

  const refs = {};

  function ensureInit() {
    if (state.initialized) {
      return true;
    }

    refs.section = document.querySelector('.journey-page');
    refs.timeframes = document.getElementById('journey-timeframes');
    refs.filters = document.getElementById('journey-filters');
    refs.toolbarSettings = document.getElementById('journey-toolbar-settings');
    refs.originTitle = refs.section?.querySelector('.journey-page__origins-title') || null;
    refs.originSearch = document.getElementById('journey-origin-search');
    refs.originList = document.getElementById('journey-origin-list');
    refs.actions = document.getElementById('journey-actions');
    refs.canvasSurface = document.getElementById('journey-canvas-surface');
    refs.panzoom = document.getElementById('journey-panzoom');
    refs.mapStage = document.getElementById('journey-map-stage');
    refs.connectors = document.getElementById('journey-connectors');
    refs.nodeMap = document.getElementById('journey-node-map');
    refs.canvasControls = document.getElementById('journey-canvas-controls');
    refs.moreMenu = document.getElementById('journey-more-menu');
    refs.openAllNodes = document.getElementById('journey-open-all-nodes');
    refs.saveBookmarks = document.getElementById('journey-save-bookmarks');
    refs.deleteBranches = document.getElementById('journey-delete-branches');

    if (!refs.section || !refs.timeframes || !refs.filters || !refs.toolbarSettings || !refs.originSearch || !refs.originList || !refs.actions || !refs.canvasSurface || !refs.panzoom || !refs.mapStage || !refs.connectors || !refs.nodeMap || !refs.canvasControls || !refs.moreMenu) {
      return false;
    }

    bindEvents();
    renderTimeframes();
    renderFilters();
    renderToolbarSettings();
    renderOriginSearch();
    renderActions();
    renderCanvasControls();
    renderOrigins();
    renderNodes();
    applyPanZoom();
    state.initialized = true;
    return true;
  }

  async function activate() {
    if (!ensureInit()) {
      return;
    }

    if (!state.preferencesLoaded) {
      await loadPreferences();
    }

    if (!state.lastLoadedAt || Date.now() - state.lastLoadedAt > RELOAD_INTERVAL_MS) {
      await loadSessions();
    }
  }

  function bindEvents() {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeydown);
    refs.canvasSurface.addEventListener('pointerdown', handlePointerDown);
    refs.canvasSurface.addEventListener('pointermove', handlePointerMove);
    refs.canvasSurface.addEventListener('pointerup', handlePointerEnd);
    refs.canvasSurface.addEventListener('pointercancel', handlePointerEnd);
    refs.canvasSurface.addEventListener('wheel', handleWheel, { passive: false });

    if (refs.openAllNodes) {
      refs.openAllNodes.addEventListener('click', async () => {
        state.menuOpen = false;
        syncMenu();
        await openAllNodes();
      });
    }

    if (refs.saveBookmarks) {
      refs.saveBookmarks.addEventListener('click', async () => {
        state.menuOpen = false;
        syncMenu();
        await saveVisibleNodes();
      });
    }

    if (refs.deleteBranches) {
      refs.deleteBranches.addEventListener('click', async () => {
        state.menuOpen = false;
        syncMenu();
        await deleteVisibleBranches();
      });
    }
  }

  async function loadPreferences() {
    if (typeof Storage === 'undefined' || typeof Storage.get !== 'function') {
      state.preferencesLoaded = true;
      return;
    }

    try {
      const storedTimeframeValue = await Storage.get(STORAGE_KEYS.timeframeValue);
      if (TIMEFRAMES.some((timeframe) => timeframe.value === storedTimeframeValue)) {
        state.timeframeValue = storedTimeframeValue;
      }
    } catch (error) {
      console.error('Journey preferences load failed:', error);
    } finally {
      state.preferencesLoaded = true;
      renderTimeframes();
    }
  }

  async function loadSessions() {
    if (state.loading) {
      return;
    }

    state.loading = true;
    renderActions();

    try {
      const timeframe = getActiveTimeframe();
      const sessions = await buildSessionsForTimeframe(timeframe.hours);
      state.sessions = sessions;
      normalizeFilterSelections();
      state.lastLoadedAt = Date.now();

      syncSelectedOrigin();
      state.activeNodeMenuId = null;
      state.menuOpen = false;

      renderFilters();
      renderToolbarSettings();
      renderOrigins();
      syncVisibleNodes();
      renderNodes();
      applyDefaultCanvasView();
    } catch (error) {
      console.error('Journey load failed:', error);
      state.sessions = [];
      state.selectedOriginId = 'all';
      syncVisibleNodes();
      renderOrigins();
      renderNodes();
    } finally {
      state.loading = false;
      renderActions();
    }
  }

  async function buildSessionsForTimeframe(hours) {
    const startTime = Date.now() - hours * 60 * 60 * 1000;
    const historyItems = await chrome.history.search({
      text: '',
      startTime,
      maxResults: MAX_HISTORY_RESULTS
    });

    const searchableItems = historyItems.filter((item) => item && isSearchableUrl(item.url));
    const visitsByItem = await Promise.all(searchableItems.map(async (item) => ({
      item,
      visits: await chrome.history.getVisits({ url: item.url })
    })));

    const visits = [];
    visitsByItem.forEach(({ item, visits: itemVisits }) => {
      itemVisits.forEach((visit) => {
        if (!visit || typeof visit.visitTime !== 'number' || visit.visitTime < startTime) {
          return;
        }

        visits.push({
          id: String(visit.visitId),
          visitTime: visit.visitTime,
          title: normalizeTitle(item.title, item.url),
          url: item.url,
          host: getHostname(item.url)
        });
      });
    });

    visits.sort((left, right) => left.visitTime - right.visitTime);

    const groupedSessions = [];
    let currentSession = null;

    visits.forEach((visit) => {
      if (!currentSession || visit.visitTime - currentSession.lastVisitTime > SESSION_GAP_MS) {
        currentSession = {
          id: `session-${visit.id}`,
          visits: [],
          lastVisitTime: visit.visitTime
        };
        groupedSessions.push(currentSession);
      }

      currentSession.visits.push(visit);
      currentSession.lastVisitTime = visit.visitTime;
    });

    return groupedSessions
      .map(finalizeSession)
      .filter(Boolean)
      .sort((left, right) => right.endTime - left.endTime);
  }

  function finalizeSession(rawSession) {
    if (!rawSession?.visits?.length) {
      return null;
    }

    const dedupedVisits = dedupeSequentialVisits(rawSession.visits);
    const startTime = dedupedVisits[0].visitTime;
    const endTime = dedupedVisits[dedupedVisits.length - 1].visitTime;
    const visits = dedupedVisits.map((visit, index) => ({
      ...visit,
      sessionId: rawSession.id,
      nodeVariant: getNodeVariant(index, dedupedVisits.length)
    }));
    const originVisit = visits[0];

    return {
      id: rawSession.id,
      title: originVisit.host || originVisit.title,
      originHost: originVisit.host || getHostname(originVisit.url),
      originUrl: originVisit.url,
      endPointHosts: Array.from(new Set(
        visits
          .filter((visit) => visit.nodeVariant === 'end-point')
          .map((visit) => visit.host)
          .filter(Boolean)
      )),
      startTime,
      endTime,
      durationMs: Math.max(endTime - startTime, 0),
      branchCount: Math.max(visits.length - 1, 0),
      visits
    };
  }

  function dedupeSequentialVisits(visits) {
    return visits.reduce((accumulator, visit) => {
      const previous = accumulator[accumulator.length - 1];
      if (previous && previous.url === visit.url) {
        return accumulator;
      }
      accumulator.push(visit);
      return accumulator;
    }, []);
  }

  function renderTimeframes() {
    refs.timeframes.innerHTML = '';
    refs.timeframes.appendChild(createSegmentedControl({
      title: 'Time frame:',
      showTitle: true,
      contrast: 'low',
      selectedValue: state.timeframeValue,
      items: TIMEFRAMES,
      ariaLabel: 'Journey timeframe',
      onChange: async (value) => {
        if (state.timeframeValue === value) {
          return;
        }
        state.timeframeValue = value;
        persistTimeframeValue();
        await loadSessions();
      }
    }));
  }

  function persistTimeframeValue() {
    if (typeof Storage === 'undefined' || typeof Storage.set !== 'function') {
      return;
    }

    Storage.set({ [STORAGE_KEYS.timeframeValue]: state.timeframeValue }).catch((error) => {
      console.error('Journey timeframe persist failed:', error);
    });
  }

  function renderFilters() {
    refs.filters.innerHTML = '';

    refs.filters.appendChild(createDomainFilterField({
      menuKey: 'origin-domain',
      label: 'Filter by origin domain',
      menuTitle: 'Origin domains',
      options: getAvailableOriginDomains(),
      selectedValues: state.originDomainFilters,
      onChange: (selectedValues) => {
        state.originDomainFilters = selectedValues;
        applyFilters();
      }
    }));

    refs.filters.appendChild(createDomainFilterField({
      menuKey: 'end-point-domain',
      label: 'Filter by end-point domain',
      menuTitle: 'End-point domains',
      options: getAvailableEndPointDomains(),
      selectedValues: state.endPointDomainFilters,
      onChange: (selectedValues) => {
        state.endPointDomainFilters = selectedValues;
        applyFilters();
      }
    }));
  }

  function renderToolbarSettings() {
    refs.toolbarSettings.innerHTML = '';

    const settingsButton = createActionButton({
      icon: createMaterialIcon('settings'),
      label: 'Additional actions',
      onClick: (event) => {
        event.stopPropagation();
        state.settingsMenuOpen = !state.settingsMenuOpen;
        renderToolbarSettings();
      }
    });
    settingsButton.classList.add('journey-page__toolbar-settings-button');
    refs.toolbarSettings.appendChild(settingsButton);

    if (typeof createTooltip === 'function') {
      createTooltip({
        text: 'Additional actions',
        target: settingsButton,
        position: 'bottom'
      });
    }

    if (!state.settingsMenuOpen) {
      return;
    }

    const menu = createSelectionMenu({
      type: 'simple',
      contrast: 'low',
      title: 'Additional actions',
      items: ['Hide all branches'],
      selectedIndices: state.hideBranches ? [0] : [],
      showClear: false,
      showSelectAll: false,
      onSelect: () => {
        state.hideBranches = !state.hideBranches;
        state.settingsMenuOpen = false;
        renderToolbarSettings();
        renderNodes();
        applyDefaultCanvasView();
        renderActions();
      }
    });
    menu.classList.add('journey-page__toolbar-settings-menu');
    menu.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    refs.toolbarSettings.appendChild(menu);
  }

  function renderOriginSearch() {
    refs.originSearch.innerHTML = '';
    const textField = createTextField({
      placeholder: 'Search journeys',
      value: state.originQuery,
      contrast: 'low',
      ariaLabel: 'Search journeys',
      onInput: (_event, value) => {
        state.originQuery = value;
        applyFilters();
      }
    });
    textField.classList.add('journey-page__origin-search-field');
    refs.originSearch.appendChild(textField);
  }

  function renderOrigins() {
    refs.originList.innerHTML = '';
    const domainFilteredSessions = getDomainFilteredSessions();
    const sessions = getFilteredSessions();

    if (refs.originTitle) {
      refs.originTitle.textContent = `Journeys (${domainFilteredSessions.length})`;
    }

    if (!sessions.length) {
      refs.originList.appendChild(createJourneyNoResults());
      return;
    }

    refs.originList.appendChild(createJourneyOriginItem({
      title: 'Show all journeys',
      details: [formatBranchCopy(sessions.reduce((sum, session) => sum + session.branchCount, 0))],
      active: state.selectedOriginId === 'all',
      ariaLabel: 'Show all journeys',
      onClick: () => {
        state.selectedOriginId = 'all';
        state.menuOpen = false;
        state.activeNodeMenuId = null;
        renderOrigins();
        syncVisibleNodes();
        renderNodes();
        applyDefaultCanvasView();
        renderActions();
        syncMenu();
      }
    }));

    sessions.forEach((session) => {
      refs.originList.appendChild(createJourneyOriginItem({
        title: session.title,
        details: [
          `Time spent: ${formatDuration(session.durationMs)}`,
          formatBranchCopy(session.branchCount)
        ],
        active: state.selectedOriginId === session.id,
        faviconUrl: session.originUrl,
        ariaLabel: session.title,
        onClick: () => {
          state.selectedOriginId = session.id;
          state.menuOpen = false;
          state.activeNodeMenuId = null;
          renderOrigins();
          syncVisibleNodes();
          renderNodes();
          applyDefaultCanvasView();
          renderActions();
          syncMenu();
        }
      }));
    });
  }

  function renderActions() {
    refs.actions.innerHTML = '';
    const endPointTabs = getEndPointTabs();
    const visibleTabs = getVisibleTabs();

    const primaryButton = createPrimaryButton({
      label: 'Open all end-points',
      icon: 'arrow_outward',
      contrast: 'high',
      disabled: state.loading || !endPointTabs.length,
      onClick: openEndPointNodes
    });
    primaryButton.classList.add('journey-page__action-button');

    const moreButton = createCommonButton({
      label: 'More',
      icon: 'more_vert',
      contrast: 'low',
      state: state.menuOpen ? 'hover' : 'idle',
      disabled: state.loading || !visibleTabs.length,
      onClick: () => {
        state.menuOpen = !state.menuOpen;
        renderActions();
        syncMenu();
      }
    });
    moreButton.id = 'journey-more-trigger';
    moreButton.classList.add('journey-page__action-button');
    moreButton.setAttribute('aria-expanded', state.menuOpen ? 'true' : 'false');
    moreButton.setAttribute('aria-haspopup', 'menu');
    moreButton.setAttribute('aria-controls', 'journey-more-menu');
    moreButton.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    refs.actions.appendChild(primaryButton);
    refs.actions.appendChild(moreButton);
    updateMoreMenuState();
  }

  function renderCanvasControls() {
    refs.canvasControls.innerHTML = '';

    const controls = [
      {
        icon: createMaterialIcon('add_2'),
        label: 'Zoom in',
        tooltip: 'Zoom in',
        onClick: () => adjustZoom(ZOOM_STEP)
      },
      {
        icon: createMaterialIcon('remove'),
        label: 'Zoom out',
        tooltip: 'Zoom out',
        onClick: () => adjustZoom(-ZOOM_STEP)
      },
      {
        icon: createMaterialIcon('fullscreen'),
        label: 'Zoom to fit',
        tooltip: 'Zoom to fit (100%)',
        onClick: resetPanZoom
      },
      {
        icon: createMaterialIcon('fullscreen_exit'),
        label: 'Zoom to fill',
        tooltip: 'Zoom to fill (show all journeys)',
        onClick: zoomToFill
      }
    ];

    controls.forEach((config) => {
      const button = createActionButton({
        icon: config.icon,
        label: config.label,
        onClick: config.onClick
      });
      button.classList.add('journey-page__canvas-control-button');
      refs.canvasControls.appendChild(button);

      if (config.tooltip && typeof createTooltip === 'function') {
        createTooltip({
          text: config.tooltip,
          target: button,
          position: 'left'
        });
      }
    });
  }

  function renderNodes() {
    refs.connectors.innerHTML = '';
    refs.nodeMap.innerHTML = '';

    const visibleNodes = getRenderableNodes();
    const layout = buildNodeLayout(visibleNodes);
    refs.mapStage.style.width = `${layout.stageWidth}px`;
    refs.mapStage.style.height = `${layout.stageHeight}px`;
    refs.mapStage.dataset.contentLeft = String(layout.contentBounds.left);
    refs.mapStage.dataset.contentTop = String(layout.contentBounds.top);
    refs.mapStage.dataset.contentWidth = String(layout.contentBounds.width);
    refs.mapStage.dataset.contentHeight = String(layout.contentBounds.height);

    visibleNodes.forEach((visit, index) => {
      const nodeLayout = layout.nodeLayouts[index];
      const nodeLeft = nodeLayout.left;
      const nodeTop = nodeLayout.top;
      const variant = visit.nodeVariant || getNodeVariant(index, visibleNodes.length);
      const card = createJourneyNodeCard({
        variant,
        state: state.activeNodeMenuId === visit.id ? 'menu-open' : 'idle',
        domain: truncateLabel(visit.title, 18),
        url: truncateLabel(visit.url, 26),
        faviconUrl: visit.url,
        menuItems: [
          { value: 'save', label: 'Save to bookmarks' }
        ],
        onClick: () => chrome.tabs.create({ url: visit.url }),
        onMenuToggle: () => {
          state.menuOpen = false;
          state.activeNodeMenuId = state.activeNodeMenuId === visit.id ? null : visit.id;
          renderActions();
          renderNodes();
          syncMenu();
        },
        onMenuAction: async (action) => {
          if (action !== 'save') {
            return;
          }

          state.activeNodeMenuId = null;
          renderNodes();
          await SaveTabsModal.show([
            {
              id: Number(String(visit.visitTime).slice(-12)),
              title: visit.title,
              url: visit.url
            }
          ]);
        }
      });
      card.classList.add('journey-page__node', `journey-page__node--${variant}`);
      card.style.left = `${nodeLeft}px`;
      card.style.top = `${nodeTop}px`;

      const visualButton = card.querySelector('.journey-node-card__visual');
      if (visualButton && typeof createTooltip === 'function') {
        card.classList.add('tooltip-trigger');
        createTooltip({
          text: formatVisitTimestamp(visit.visitTime),
          target: visualButton,
          position: 'top',
          delay: 'fast'
        });
      }

      refs.nodeMap.appendChild(card);

      const nextVisit = visibleNodes[index + 1];
      if (nextVisit && nextVisit.sessionId === visit.sessionId) {
        const connector = document.createElement('span');
        connector.className = 'journey-page__connector';
        connector.style.left = `${nodeLeft + CONNECTOR_LEFT_OFFSET}px`;
        connector.style.top = `${nodeTop + CONNECTOR_TOP_OFFSET}px`;
        connector.style.width = `${CONNECTOR_WIDTH}px`;
        refs.connectors.appendChild(connector);
      }
    });

    applyPanZoom();
  }

  function syncVisibleNodes() {
    const sessions = getFilteredSessions();

    if (!sessions.length) {
      state.visibleNodes = [];
      return;
    }

    if (state.selectedOriginId === 'all') {
      const aggregated = sessions
        .flatMap((session) => session.visits)
        .sort((left, right) => left.visitTime - right.visitTime);
      state.visibleNodes = aggregated;
      return;
    }

    const session = sessions.find((candidate) => candidate.id === state.selectedOriginId) || sessions[0];
    state.visibleNodes = session ? session.visits.slice() : [];
  }

  function getVisibleTabs() {
    return getRenderableNodes().map((visit, index) => ({
      id: Number(`${Date.now()}${index}`.slice(-12)),
      title: visit.title,
      url: visit.url
    }));
  }

  function getEndPointTabs() {
    return getRenderableNodes()
      .filter((visit) => visit.nodeVariant === 'end-point')
      .map((visit, index) => ({
        id: Number(`${visit.visitTime}${index}`.slice(-12)),
        title: visit.title,
        url: visit.url
      }));
  }

  function getVisibleHistoryDeletionTargets() {
    const seen = new Set();
    return getRenderableNodes()
      .filter((visit) => visit.url)
      .filter((visit) => {
        if (seen.has(visit.url)) {
          return false;
        }
        seen.add(visit.url);
        return true;
      });
  }

  function buildNodeLayout(nodes) {
    if (!nodes.length) {
      return {
        nodeLayouts: [],
        stageWidth: BASE_STAGE_WIDTH,
        stageHeight: BASE_STAGE_HEIGHT,
        contentBounds: {
          left: 0,
          top: 0,
          width: 0,
          height: 0
        }
      };
    }

    const rows = [];
    let currentRow = null;

    nodes.forEach((node) => {
      if (!currentRow || currentRow.sessionId !== node.sessionId) {
        currentRow = {
          sessionId: node.sessionId,
          nodes: []
        };
        rows.push(currentRow);
      }

      currentRow.nodes.push(node);
    });

    const nodeLayouts = [];
    let contentLeft = Number.POSITIVE_INFINITY;
    let contentTop = Number.POSITIVE_INFINITY;
    let contentRight = 0;
    let contentBottom = 0;

    rows.forEach((row, rowIndex) => {
      const indent = rows.length > 1
        ? (rowIndex % ROW_INDENT_CYCLE) * ROW_INDENT_STEP
        : 0;
      const rowLeft = STAGE_HORIZONTAL_PADDING + indent;
      const rowTop = NODE_TOP + (rowIndex * ROW_VERTICAL_GAP);

      row.nodes.forEach((node, columnIndex) => {
        const left = rowLeft + (columnIndex * NODE_GAP);
        const top = rowTop;
        nodeLayouts.push({
          id: node.id,
          left,
          top,
          rowIndex,
          columnIndex
        });

        contentLeft = Math.min(contentLeft, left);
        contentTop = Math.min(contentTop, top);
        contentRight = Math.max(contentRight, left + 85);
        contentBottom = Math.max(contentBottom, top + NODE_RENDER_HEIGHT);
      });
    });

    const safeContentLeft = Number.isFinite(contentLeft) ? contentLeft : 0;
    const safeContentTop = Number.isFinite(contentTop) ? contentTop : 0;
    const contentBounds = {
      left: safeContentLeft,
      top: safeContentTop,
      width: Math.max(contentRight - safeContentLeft, 0),
      height: Math.max(contentBottom - safeContentTop, 0)
    };

    return {
      nodeLayouts,
      stageWidth: Math.max(BASE_STAGE_WIDTH, contentRight + STAGE_HORIZONTAL_PADDING),
      stageHeight: Math.max(BASE_STAGE_HEIGHT, contentBottom + STAGE_VERTICAL_PADDING),
      contentBounds
    };
  }

  async function openEndPointNodes() {
    const tabs = getEndPointTabs();
    for (const tab of tabs) {
      await chrome.tabs.create({ url: tab.url, active: false });
    }
  }

  async function openAllNodes() {
    const tabs = getVisibleTabs();
    for (const tab of tabs) {
      await chrome.tabs.create({ url: tab.url, active: false });
    }
  }

  async function saveVisibleNodes() {
    const tabs = getVisibleTabs();
    if (!tabs.length) {
      return;
    }
    await SaveTabsModal.show(tabs);
  }

  async function deleteVisibleBranches() {
    const targets = getVisibleHistoryDeletionTargets();
    if (!targets.length || typeof chrome === 'undefined' || !chrome.history || typeof chrome.history.deleteUrl !== 'function') {
      return;
    }

    const confirmed = typeof Modal !== 'undefined' && typeof Modal.openConfirmation === 'function'
      ? await Modal.openConfirmation({
        title: 'Are you sure?',
        message: `This will delete all Chrome history entries for ${targets.length} visible journey URL${targets.length === 1 ? '' : 's'}, including origins, branches, and end-points. This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        destructive: true
      })
      : window.confirm('Are you sure? This will delete all Chrome history entries for the visible journey URLs, including origins, branches, and end-points.');

    if (!confirmed) {
      return;
    }

    await Promise.all(targets.map((target) => chrome.history.deleteUrl({ url: target.url })));
    await loadSessions();
  }

  function handleDocumentClick(event) {
    if (event.target.closest('.journey-page__toolbar-settings')) {
      return;
    }

    if (state.settingsMenuOpen) {
      state.settingsMenuOpen = false;
      renderToolbarSettings();
    }

    if (event.target.closest('.journey-page__filter-control')) {
      return;
    }

    if (state.openFilterMenu !== null) {
      state.openFilterMenu = null;
      renderFilters();
    }

    if (event.target.closest('.journey-node-card__menu') || event.target.closest('.journey-node-card__menu-trigger')) {
      return;
    }

    if (state.activeNodeMenuId !== null) {
      state.activeNodeMenuId = null;
      renderNodes();
    }

    if (state.menuOpen) {
      const trigger = document.getElementById('journey-more-trigger');
      if (refs.moreMenu.contains(event.target) || (trigger && trigger.contains(event.target))) {
        return;
      }

      state.menuOpen = false;
      renderActions();
      syncMenu();
    }
  }

  function handleKeydown(event) {
    if (event.key !== 'Escape') {
      return;
    }

    let didUpdate = false;

    if (state.activeNodeMenuId !== null) {
      state.activeNodeMenuId = null;
      renderNodes();
      didUpdate = true;
    }

    if (state.settingsMenuOpen) {
      state.settingsMenuOpen = false;
      renderToolbarSettings();
      didUpdate = true;
    }

    if (state.openFilterMenu !== null) {
      state.openFilterMenu = null;
      renderFilters();
      didUpdate = true;
    }

    if (state.menuOpen) {
      state.menuOpen = false;
      renderActions();
      syncMenu();
      didUpdate = true;
    }

    if (!didUpdate) {
      return;
    }
  }

  function syncMenu() {
    refs.section.classList.toggle('journey-page--menu-open', state.menuOpen);
    refs.moreMenu.hidden = !state.menuOpen;
    updateMoreMenuState();
    const trigger = document.getElementById('journey-more-trigger');
    if (trigger) {
      trigger.setAttribute('aria-expanded', state.menuOpen ? 'true' : 'false');
    }
  }

  function updateMoreMenuState() {
    if (refs.openAllNodes) {
      refs.openAllNodes.disabled = !getVisibleTabs().length;
    }
    if (refs.saveBookmarks) {
      refs.saveBookmarks.disabled = !getVisibleTabs().length;
    }
    if (refs.deleteBranches) {
      refs.deleteBranches.disabled = !getVisibleHistoryDeletionTargets().length;
    }
  }

  function getRenderableNodes() {
    if (!state.hideBranches) {
      return state.visibleNodes;
    }

    return state.visibleNodes.filter((visit) => visit.nodeVariant !== 'branch');
  }

  function handlePointerDown(event) {
    if (event.button !== 0 || shouldIgnorePanTarget(event.target)) {
      return;
    }

    state.dragPointerId = event.pointerId;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.dragOriginX = state.panX;
    state.dragOriginY = state.panY;
    refs.canvasSurface.setPointerCapture(event.pointerId);
    refs.canvasSurface.classList.add('journey-page__canvas-surface--dragging');
  }

  function handlePointerMove(event) {
    if (state.dragPointerId !== event.pointerId) {
      return;
    }

    state.panX = state.dragOriginX + (event.clientX - state.dragStartX);
    state.panY = state.dragOriginY + (event.clientY - state.dragStartY);
    clampPan();
    applyPanZoom();
  }

  function handlePointerEnd(event) {
    if (state.dragPointerId !== event.pointerId) {
      return;
    }

    refs.canvasSurface.releasePointerCapture(event.pointerId);
    state.dragPointerId = null;
    refs.canvasSurface.classList.remove('journey-page__canvas-surface--dragging');
  }

  function handleWheel(event) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.1 : -0.1;
      const nextScale = clamp(state.scale + delta, MIN_SCALE, MAX_SCALE);
      if (nextScale === state.scale) {
        return;
      }

      const rect = refs.canvasSurface.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const worldX = (pointerX - state.panX) / state.scale;
      const worldY = (pointerY - state.panY) / state.scale;

      state.scale = nextScale;
      state.panX = pointerX - (worldX * state.scale);
      state.panY = pointerY - (worldY * state.scale);
      clampPan();
      applyPanZoom();
      return;
    }

    if (!event.deltaX && !event.deltaY) {
      return;
    }

    event.preventDefault();
    state.panX -= event.deltaX;
    state.panY -= event.deltaY;
    clampPan();
    applyPanZoom();
  }

  function applyPanZoom() {
    refs.panzoom.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
  }

  function resetPanZoom() {
    state.scale = 1;
    const rect = refs.canvasSurface.getBoundingClientRect();
    const contentBounds = getContentBounds();
    const contentCenterX = contentBounds.width > 0
      ? contentBounds.left + (contentBounds.width / 2)
      : refs.mapStage.offsetWidth / 2;
    const contentCenterY = contentBounds.height > 0
      ? contentBounds.top + (contentBounds.height / 2)
      : refs.mapStage.offsetHeight / 2;

    state.panX = (rect.width / 2) - contentCenterX;
    state.panY = (rect.height / 2) - contentCenterY;
    clampPan();
    applyPanZoom();
  }

  function applyDefaultCanvasView() {
    zoomToFill();
  }

  function zoomToFill() {
    const rect = refs.canvasSurface.getBoundingClientRect();
    const contentBounds = getContentBounds();

    if (!contentBounds.width || !contentBounds.height || !rect.width || !rect.height) {
      resetPanZoom();
      return;
    }

    const availableWidth = Math.max(rect.width - (FIT_PADDING * 2), 1);
    const availableHeight = Math.max(rect.height - (FIT_PADDING * 2), 1);
    const nextScale = clamp(
      Math.min(availableWidth / contentBounds.width, availableHeight / contentBounds.height),
      MIN_SCALE,
      MAX_SCALE
    );

    state.scale = nextScale;
    const contentCenterX = contentBounds.left + (contentBounds.width / 2);
    const contentCenterY = contentBounds.top + (contentBounds.height / 2);
    state.panX = (rect.width / 2) - (contentCenterX * state.scale);
    state.panY = (rect.height / 2) - (contentCenterY * state.scale);
    clampPan();
    applyPanZoom();
  }

  function adjustZoom(delta) {
    const rect = refs.canvasSurface.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const worldX = (centerX - state.panX) / state.scale;
    const worldY = (centerY - state.panY) / state.scale;
    const nextScale = clamp(state.scale + delta, MIN_SCALE, MAX_SCALE);

    if (nextScale === state.scale) {
      return;
    }

    state.scale = nextScale;
    state.panX = centerX - (worldX * state.scale);
    state.panY = centerY - (worldY * state.scale);
    clampPan();
    applyPanZoom();
  }

  function clampPan() {
    const rect = refs.canvasSurface.getBoundingClientRect();
    const stageWidth = refs.mapStage.offsetWidth * state.scale;
    const stageHeight = refs.mapStage.offsetHeight * state.scale;
    const minPanX = Math.min(0, rect.width - stageWidth);
    const minPanY = Math.min(0, rect.height - stageHeight);
    const maxPanX = Math.max(0, rect.width - stageWidth);
    const maxPanY = Math.max(0, rect.height - stageHeight);

    state.panX = clamp(state.panX, minPanX - 80, maxPanX + 80);
    state.panY = clamp(state.panY, minPanY - 80, maxPanY + 80);
  }

  function getContentBounds() {
    return {
      left: Number(refs.mapStage.dataset.contentLeft || '0'),
      top: Number(refs.mapStage.dataset.contentTop || '0'),
      width: Number(refs.mapStage.dataset.contentWidth || '0'),
      height: Number(refs.mapStage.dataset.contentHeight || '0')
    };
  }

  function shouldIgnorePanTarget(target) {
    return Boolean(target.closest('button, a, input, select, textarea'));
  }

  function getActiveTimeframe() {
    return TIMEFRAMES.find((timeframe) => timeframe.value === state.timeframeValue) || TIMEFRAMES[0];
  }

  function isSearchableUrl(url) {
    if (!url) {
      return false;
    }

    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function normalizeTitle(title, url) {
    if (typeof title === 'string' && title.trim()) {
      return title.trim();
    }

    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
      return url || 'Untitled';
    }
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
      return '';
    }
  }

  function formatDuration(durationMs) {
    const minutes = Math.max(1, Math.round(durationMs / 60000));
    if (minutes < 60) {
      return `${minutes} min${minutes === 1 ? '' : 's'}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (!remainingMinutes) {
      return `${hours} hr${hours === 1 ? '' : 's'}`;
    }
    return `${hours} hr ${remainingMinutes} min`;
  }

  function formatBranchCopy(branchCount) {
    return `${branchCount} branch${branchCount === 1 ? '' : 'es'}`;
  }

  function formatFilterSelectionCopy(count) {
    return `${count} domain${count === 1 ? '' : 's'} selected`;
  }

  function formatVisitTimestamp(visitTime) {
    const date = new Date(visitTime);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${hours}:${minutes}:${seconds} ${month}:${day}:${year}`;
  }

  function createDomainFilterField(options = {}) {
    const {
      menuKey,
      label,
      menuTitle,
      options: menuOptions,
      selectedValues,
      onChange
    } = options;

    const selectedIndices = menuOptions
      .map((item, index) => (selectedValues.includes(item) ? index : -1))
      .filter((index) => index !== -1);

    const menu = createSelectionMenu({
      type: 'simple',
      contrast: 'low',
      title: menuTitle,
      items: menuOptions,
      selectedIndices,
      showClear: selectedValues.length > 0,
      showSelectAll: menuOptions.length > 0,
      onSelect: (index) => {
        const value = menuOptions[index];
        if (!value) {
          return;
        }

        const nextValues = selectedValues.includes(value)
          ? selectedValues.filter((item) => item !== value)
          : [...selectedValues, value];
        onChange(nextValues);
      },
      onClear: () => onChange([]),
      onSelectAll: () => onChange(menuOptions.slice())
    });

    const field = createSelectionField({
      label,
      selectionText: formatFilterSelectionCopy(selectedValues.length),
      state: state.openFilterMenu === menuKey ? 'active' : selectedValues.length ? 'selection' : 'idle',
      contrast: 'low',
      menu,
      onToggle: () => {
        state.openFilterMenu = state.openFilterMenu === menuKey ? null : menuKey;
        renderFilters();
      },
      onClear: selectedValues.length ? () => onChange([]) : null
    });
    field.classList.add('journey-page__filter-control');

    const menuWrapper = field.querySelector('.selection-field__menu');
    if (menuWrapper) {
      menuWrapper.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }

    return field;
  }

  function getAvailableOriginDomains() {
    return Array.from(new Set(
      state.sessions
        .map((session) => session.originHost)
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right));
  }

  function getAvailableEndPointDomains() {
    return Array.from(new Set(
      state.sessions
        .flatMap((session) => session.endPointHosts || [])
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right));
  }

  function normalizeFilterSelections() {
    const originDomains = new Set(getAvailableOriginDomains());
    const endPointDomains = new Set(getAvailableEndPointDomains());
    state.originDomainFilters = state.originDomainFilters.filter((value) => originDomains.has(value));
    state.endPointDomainFilters = state.endPointDomainFilters.filter((value) => endPointDomains.has(value));
  }

  function getDomainFilteredSessions() {
    return state.sessions.filter((session) => matchesDomainFilters(session));
  }

  function getFilteredSessions() {
    const query = state.originQuery.trim().toLowerCase();
    const sessions = getDomainFilteredSessions();
    if (!query) {
      return sessions;
    }

    return sessions.filter((session) => {
      const title = (session.title || '').toLowerCase();
      const originHost = (session.originHost || '').toLowerCase();
      return title.includes(query) || originHost.includes(query);
    });
  }

  function matchesDomainFilters(session) {
    const matchesOrigin = !state.originDomainFilters.length
      || state.originDomainFilters.includes(session.originHost);
    const matchesEndPoint = !state.endPointDomainFilters.length
      || (session.endPointHosts || []).some((host) => state.endPointDomainFilters.includes(host));
    return matchesOrigin && matchesEndPoint;
  }

  function syncSelectedOrigin() {
    const sessions = getFilteredSessions();
    if (state.selectedOriginId !== 'all' && !sessions.some((session) => session.id === state.selectedOriginId)) {
      state.selectedOriginId = 'all';
    }
  }

  function applyFilters() {
    syncSelectedOrigin();
    state.menuOpen = false;
    state.activeNodeMenuId = null;
    renderFilters();
    renderOrigins();
    syncVisibleNodes();
    renderNodes();
    applyDefaultCanvasView();
    renderActions();
    syncMenu();
  }

  function createJourneyNoResults() {
    const empty = document.createElement('div');
    empty.className = 'journey-page__origin-empty';

    const label = document.createElement('p');
    label.className = 'journey-page__origin-empty-label';
    label.textContent = 'No results found';

    empty.appendChild(label);
    return empty;
  }

  function getNodeVariant(index, total) {
    if (total <= 1) {
      return 'origin';
    }
    if (index === 0) {
      return 'origin';
    }
    if (index === total - 1) {
      return 'end-point';
    }
    return 'branch';
  }

  function truncateLabel(value, maxLength) {
    if (!value || value.length <= maxLength) {
      return value || '';
    }
    return `${value.slice(0, maxLength - 1)}…`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createMaterialIcon(name) {
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = name;
    return icon;
  }

  return {
    activate
  };
})();

window.JourneyPage = JourneyPage;
