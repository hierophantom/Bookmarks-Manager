(function changelogVisualizerBootstrap() {
  const contentRoot = document.getElementById('changelog-content');
  if (!contentRoot) return;

  fetch('./CHANGELOG.md')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Unable to load CHANGELOG.md');
      }
      return response.text();
    })
    .then((markdown) => {
      if (!window.ChangelogParser || typeof window.ChangelogParser.parse !== 'function') {
        throw new Error('Changelog parser is unavailable');
      }
      const versions = window.ChangelogParser.parse(markdown);
      renderChangelog(contentRoot, versions);
    })
    .catch((error) => {
      renderError(contentRoot, error);
    });

  function renderChangelog(container, versions) {
    container.innerHTML = '';

    if (!Array.isArray(versions) || versions.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'changelog-empty';
      emptyState.textContent = 'No changelog entries were found.';
      container.appendChild(emptyState);
      return;
    }

    versions.forEach((version) => {
      const section = document.createElement('section');
      section.className = 'changelog-version';

      const heading = document.createElement('h2');
      heading.textContent = version.heading;
      section.appendChild(heading);

      if (Array.isArray(version.tags) && version.tags.length > 0) {
        const tagsRow = document.createElement('div');
        tagsRow.className = 'changelog-tags';
        version.tags.forEach((tagText) => {
          const pill = document.createElement('span');
          pill.className = 'changelog-pill';
          pill.textContent = tagText;
          tagsRow.appendChild(pill);
        });
        section.appendChild(tagsRow);
      }

      if (version.summary) {
        const summary = document.createElement('p');
        summary.className = 'changelog-summary';
        summary.textContent = version.summary;
        section.appendChild(summary);
      }

      version.sections.forEach((group) => {
        const block = document.createElement('div');
        block.className = 'changelog-block';

        const blockTitle = document.createElement('h3');
        blockTitle.textContent = group.title;
        block.appendChild(blockTitle);

        const list = document.createElement('ul');
        list.className = 'changelog-list';
        group.items.forEach((item) => {
          const listItem = document.createElement('li');
          if (item.title) {
            const strong = document.createElement('strong');
            strong.textContent = `${item.title}: `;
            listItem.appendChild(strong);
          }
          listItem.appendChild(document.createTextNode(item.text));
          list.appendChild(listItem);
        });

        block.appendChild(list);
        section.appendChild(block);
      });

      container.appendChild(section);
    });
  }

  function renderError(container, error) {
    container.innerHTML = '';
    const errorState = document.createElement('p');
    errorState.className = 'changelog-error';
    errorState.textContent = `Could not render changelog: ${error && error.message ? error.message : 'unknown error'}`;
    container.appendChild(errorState);
  }
})();
