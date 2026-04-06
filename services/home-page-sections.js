const HomePageSectionsService = (() => {
  const STORAGE_KEY = 'homePageSections';

  const SECTION_DEFINITIONS = [
    {
      id: 'search',
      label: 'Search',
      description: 'Homepage search widget area.',
      icon: 'search',
      defaultVisible: true,
      defaultOrder: 20
    },
    {
      id: 'quick-links',
      label: 'Quick links',
      description: 'Pinned bookmark shortcuts section.',
      icon: 'bolt',
      defaultVisible: true,
      defaultOrder: 30
    },
    {
      id: 'widgets',
      label: 'Widgets',
      description: 'Standard widget area.',
      icon: 'widgets',
      defaultVisible: true,
      defaultOrder: 40
    }
  ];

  function getDefinitions() {
    return SECTION_DEFINITIONS.map((definition) => ({ ...definition }));
  }

  function getDefaultState() {
    return SECTION_DEFINITIONS.reduce((accumulator, definition) => {
      accumulator[definition.id] = {
        visible: definition.defaultVisible,
        order: definition.defaultOrder
      };
      return accumulator;
    }, {});
  }

  async function getState() {
    const stored = await Storage.get(STORAGE_KEY);
    return mergeState(stored);
  }

  async function isSectionVisible(sectionId) {
    const state = await getState();
    return state[sectionId] ? state[sectionId].visible !== false : true;
  }

  async function setSectionVisibility(sectionId, visible) {
    const state = await getState();
    if (!state[sectionId]) {
      return state;
    }

    state[sectionId].visible = Boolean(visible);
    await Storage.set({ [STORAGE_KEY]: state });
    return state;
  }

  function mergeState(input) {
    const defaults = getDefaultState();
    if (!input || typeof input !== 'object') {
      return defaults;
    }

    Object.keys(defaults).forEach((sectionId) => {
      const candidate = input[sectionId];
      if (!candidate || typeof candidate !== 'object') {
        return;
      }

      if (typeof candidate.visible === 'boolean') {
        defaults[sectionId].visible = candidate.visible;
      }

      if (Number.isFinite(candidate.order)) {
        defaults[sectionId].order = candidate.order;
      }
    });

    return defaults;
  }

  const api = {
    STORAGE_KEY,
    getDefinitions,
    getDefaultState,
    getState,
    isSectionVisible,
    setSectionVisibility
  };

  if (typeof window !== 'undefined') {
    window.HomePageSectionsService = api;
  }

  return api;
})();