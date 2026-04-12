const ChangelogParser = (() => {
  function parse(markdown) {
    const lines = String(markdown || '').split(/\r?\n/);
    const versions = [];
    let currentVersion = null;
    let currentSection = null;

    lines.forEach((rawLine) => {
      const line = rawLine.trimEnd();
      const versionMatch = line.match(/^##\s+(.+)$/);
      if (versionMatch) {
        const heading = versionMatch[1].trim();
        if (/^entry format$/i.test(heading)) return;
        currentVersion = {
          heading,
          tags: [],
          summary: '',
          sections: [],
          legacyItems: []
        };
        currentSection = null;
        versions.push(currentVersion);
        return;
      }

      if (!currentVersion) {
        return;
      }

      const tagsMatch = line.match(/^Tags:\s*(.+)$/i);
      if (tagsMatch) {
        currentVersion.tags = tagsMatch[1]
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
        return;
      }

      const summaryMatch = line.match(/^Summary:\s*(.+)$/i);
      if (summaryMatch) {
        currentVersion.summary = summaryMatch[1].trim();
        return;
      }

      const sectionMatch = line.match(/^###\s+(.+)$/);
      if (sectionMatch) {
        currentSection = {
          title: sectionMatch[1].trim(),
          items: []
        };
        currentVersion.sections.push(currentSection);
        return;
      }

      const legacyMatch = line.match(/^\s*-\s*\[([^\]]+)\]\s+(.+?)\s*::\s*(.+)\s*$/);
      if (legacyMatch) {
        currentVersion.legacyItems.push({
          tag: legacyMatch[1].trim(),
          title: legacyMatch[2].trim(),
          text: legacyMatch[3].trim()
        });
        return;
      }

      const bulletMatch = line.match(/^\s*-\s+(.+)$/);
      if (bulletMatch && currentSection) {
        const itemText = bulletMatch[1].trim();
        const splitIndex = itemText.indexOf(':');
        if (splitIndex > -1) {
          currentSection.items.push({
            title: itemText.slice(0, splitIndex).trim(),
            text: itemText.slice(splitIndex + 1).trim()
          });
        } else {
          currentSection.items.push({
            title: '',
            text: itemText
          });
        }
      }
    });

    versions.forEach(normalizeVersion);
    return versions.filter((version) => version.sections.length > 0 || version.summary || version.tags.length > 0);
  }

  function normalizeVersion(version) {
    if (!version.summary && version.legacyItems.length > 0) {
      version.summary = version.legacyItems[0].text;
    }

    if (version.sections.length === 0 && version.legacyItems.length > 0) {
      const groupedSections = new Map();
      version.legacyItems.forEach((item) => {
        const title = normalizeLegacySectionTitle(item.tag);
        if (!groupedSections.has(title)) {
          groupedSections.set(title, { title, items: [] });
        }
        groupedSections.get(title).items.push({
          title: item.title,
          text: item.text
        });
      });
      version.sections = Array.from(groupedSections.values());
    }

    if (version.tags.length === 0 && version.legacyItems.length > 0) {
      const seen = new Set();
      version.tags = version.legacyItems
        .map((item) => toDisplayTag(item.tag))
        .filter((tag) => {
          if (seen.has(tag)) return false;
          seen.add(tag);
          return true;
        })
        .slice(0, 3);
    }

    if (version.tags.length > 3) {
      version.tags = version.tags.slice(0, 3);
    }
  }

  function normalizeLegacySectionTitle(tag) {
    const normalized = String(tag || '').trim().toLowerCase();
    if (!normalized) return 'Notes';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function toDisplayTag(tag) {
    const trimmed = String(tag || '').trim();
    if (!trimmed) return '#Update';
    return trimmed.startsWith('#') ? trimmed : `#${trimmed.replace(/\s+/g, '_')}`;
  }

  return {
    parse,
    toDisplayTag
  };
})();

if (typeof window !== 'undefined') {
  window.ChangelogParser = ChangelogParser;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChangelogParser;
}
