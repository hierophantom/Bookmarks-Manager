(function(){
  class TagMultiSelect {
    constructor({ input, getTags, onChange, placeholder = 'Filter by tags...' }) {
      if (!input || typeof getTags !== 'function') {
        throw new Error('TagMultiSelect requires input and getTags()');
      }
      this.input = input;
      this.getTags = getTags;
      this.onChange = typeof onChange === 'function' ? onChange : () => {};
      this.placeholder = placeholder;
      this.selected = new Set();
      this.dropdown = null;
      this.isOpen = false;
      this.tags = [];
      this._init();
    }

    async _init() {
      this.input.setAttribute('readonly', 'readonly');
      this.input.placeholder = this.placeholder;
      this.input.addEventListener('click', () => this.toggle());
      this.input.addEventListener('keydown', (e) => {
        // prevent typing
        const navKeys = ['ArrowDown','ArrowUp','Enter','Escape'];
        if (!navKeys.includes(e.key)) {
          e.preventDefault();
        }
        if (e.key === 'Enter') {
          this.toggle();
        } else if (e.key === 'Escape') {
          this.close();
        }
      });
      document.addEventListener('click', (e) => {
        if (this.isOpen && this.dropdown && !this.dropdown.contains(e.target) && e.target !== this.input) {
          this.close();
        }
      });
      await this._loadTags();
      this._renderDropdown();
      this._updateFieldLabel();
    }

    async _loadTags() {
      try {
        const list = await this.getTags();
        this.tags = Array.isArray(list) ? list.slice().sort((a,b)=>a.localeCompare(b)) : [];
      } catch (e) {
        console.error('TagMultiSelect: failed to load tags', e);
        this.tags = [];
      }
    }

    _renderDropdown() {
      if (!this.dropdown) {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'bm-tag-dropdown';
        this.dropdown.style.display = 'none';
        // position below input
        const rect = this.input.getBoundingClientRect();
        this.dropdown.style.position = 'absolute';
        // use fixed to not scroll with container
        this.dropdown.style.left = rect.left + 'px';
        this.dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
        document.body.appendChild(this.dropdown);
      } else {
        this.dropdown.innerHTML = '';
      }

      if (!this.tags.length) {
        const empty = document.createElement('div');
        empty.className = 'bm-tag-suggestion';
        empty.textContent = 'No tags found';
        empty.style.color = 'var(--theme-secondary)';
        this.dropdown.appendChild(empty);
        return;
      }

      // Controls row: Select all / Clear
      const controls = document.createElement('div');
      controls.className = 'bm-tag-suggestion';
      controls.style.display = 'flex';
      controls.style.justifyContent = 'space-between';
      controls.style.alignItems = 'center';
      const selectAllBtn = document.createElement('button');
      selectAllBtn.textContent = 'Select all';
      selectAllBtn.style.cssText = 'padding:4px 8px;border:1px solid var(--theme-border);border-radius:6px;background:#fff;cursor:pointer;font-size:12px;margin-right:8px;';
      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Clear';
      clearBtn.style.cssText = 'padding:4px 8px;border:1px solid var(--theme-border);border-radius:6px;background:#fff;cursor:pointer;font-size:12px;';
      const left = document.createElement('div');
      left.appendChild(selectAllBtn);
      const right = document.createElement('div');
      right.appendChild(clearBtn);
      controls.appendChild(left);
      controls.appendChild(right);
      this.dropdown.appendChild(controls);

      selectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selected = new Set(this.tags);
        this._renderDropdown();
        this._updateFieldLabel();
        this.onChange(Array.from(this.selected));
      });
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selected = new Set();
        this._renderDropdown();
        this._updateFieldLabel();
        this.onChange([]);
      });

      this.tags.forEach(tag => {
        const row = document.createElement('div');
        row.className = 'bm-tag-suggestion';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.marginRight = '8px';
        checkbox.checked = this.selected.has(tag);
        const label = document.createElement('span');
        label.textContent = tag;
        row.appendChild(checkbox);
        row.appendChild(label);
        row.addEventListener('click', (e) => {
          if (e.target === checkbox) {
            // already toggled
          } else {
            checkbox.checked = !checkbox.checked;
          }
          this._toggleTag(tag, checkbox.checked);
        });
        this.dropdown.appendChild(row);
      });
    }

    _toggleTag(tag, checked) {
      if (checked) this.selected.add(tag); else this.selected.delete(tag);
      this._updateFieldLabel();
      this.onChange(Array.from(this.selected));
    }

    _updateFieldLabel() {
      const count = this.selected.size;
      if (count > 0) {
        this.input.value = `${count} tags selected`;
      } else {
        this.input.value = '';
        this.input.placeholder = this.placeholder;
      }
    }

    open() {
      if (!this.dropdown) return;
      this._ensurePosition();
      this.dropdown.style.display = 'block';
      this.isOpen = true;
    }

    close() {
      if (!this.dropdown) return;
      this.dropdown.style.display = 'none';
      this.isOpen = false;
    }

    toggle() {
      if (this.isOpen) this.close(); else this.open();
    }

    _ensurePosition() {
      const rect = this.input.getBoundingClientRect();
      this.dropdown.style.left = rect.left + 'px';
      this.dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
      this.dropdown.style.minWidth = rect.width + 'px';
    }

    setSelected(tags) {
      this.selected = new Set(Array.isArray(tags) ? tags : []);
      this._renderDropdown();
      this._updateFieldLabel();
    }

    getSelected() {
      return Array.from(this.selected);
    }
  }

  window.TagMultiSelect = TagMultiSelect;
})();
