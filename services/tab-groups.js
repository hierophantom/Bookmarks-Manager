const TabGroupsService = (()=>{
  
  // Check if tabGroups API is available
  const hasTabGroupsAPI = typeof chrome !== 'undefined' && chrome.tabGroups && typeof chrome.tabGroups.query === 'function';
  
  async function getTabGroups(){
    try {
      if (!hasTabGroupsAPI) {
        console.warn('TabGroupsService: chrome.tabGroups API not available');
        return [];
      }
      const groups = await chrome.tabGroups.query({});
      return groups || [];
    } catch (e) {
      console.warn('TabGroupsService.getTabGroups failed', e);
      return [];
    }
  }
  
  async function getGroupTabs(groupId){
    try {
      if (!hasTabGroupsAPI) return [];
      const tabs = await chrome.tabs.query({groupId});
      return tabs || [];
    } catch (e) {
      console.warn('TabGroupsService.getGroupTabs failed', e);
      return [];
    }
  }
  
  async function focusTab(tabId){
    try {
      await chrome.tabs.update(tabId, {active: true});
    } catch (e) {
      console.error('TabGroupsService.focusTab failed', e);
    }
  }
  
  async function closeTab(tabId){
    try {
      await chrome.tabs.remove(tabId);
    } catch (e) {
      console.error('TabGroupsService.closeTab failed', e);
    }
  }
  
  async function focusGroup(groupId){
    try {
      if (!hasTabGroupsAPI) return;
      // Get first tab in the group and switch to it
      const tabs = await getGroupTabs(groupId);
      if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id, {active: true});
        await chrome.windows.update(tabs[0].windowId, {focused: true});
      }
    } catch (e) {
      console.error('TabGroupsService.focusGroup failed', e);
    }
  }
  
  async function closeTabGroup(groupId){
    try {
      const tabs = await getGroupTabs(groupId);
      const tabIds = tabs.map(t => t.id);
      if (tabIds.length > 0) {
        await chrome.tabs.remove(tabIds);
      }
    } catch (e) {
      console.error('TabGroupsService.closeTabGroup failed', e);
    }
  }
  
  async function removeTabGroup(groupId){
    try {
      // Ungroup all tabs (move them out of the group)
      const tabs = await getGroupTabs(groupId);
      const tabIds = tabs.map(t => t.id);
      if (tabIds.length > 0) {
        await chrome.tabs.ungroup(tabIds);
      }
    } catch (e) {
      console.error('TabGroupsService.removeTabGroup failed', e);
    }
  }
  
  async function updateTabGroup(groupId, updates){
    try {
      await chrome.tabGroups.update(groupId, updates);
    } catch (e) {
      console.error('TabGroupsService.updateTabGroup failed', e);
    }
  }
  
  async function render(containerId){
    try {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      if (!hasTabGroupsAPI) {
        container.innerHTML = '<p style="color:#999;font-size:90%;">Tab Groups API not available on this Chrome version</p>';
        return;
      }
      
      const groups = await getTabGroups();
      if (!groups || groups.length === 0) {
        container.innerHTML = '<p style="color:#999;font-size:90%;">No tab groups</p>';
        return;
      }
      
      let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
      
      for (const group of groups) {
        const tabs = await getGroupTabs(group.id);
        const bgColor = group.color || 'grey';
        const colorMap = {
          'grey': '#999',
          'blue': '#1f5cf0',
          'red': '#d32f2f',
          'yellow': '#f57f17',
          'green': '#388e3c',
          'pink': '#c2185b',
          'purple': '#7b1fa2',
          'cyan': '#00838f'
        };
        
        const color = colorMap[bgColor] || '#999';
        const title = group.title || `Untitled Group (${tabs.length} tabs)`;
        
        html += `
          <div class="tab-group-item" style="
            border-left: 4px solid ${color};
            background: ${color}08;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 12px;
          " 
          data-group-id="${group.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="flex:1;">
                <strong style="color:${color}">${escapeHtml(title)}</strong>
                <div style="font-size:80%;color:${color};margin-top:2px;">${escapeHtml(bgColor)} • ${tabs.length} tab${tabs.length !== 1 ? 's' : ''}</div>
              </div>
              <div style="display:flex;gap:4px;">
                <button class="edit-group-btn" style="padding:4px 8px;font-size:90%;cursor:pointer;background:#fff;border:1px solid #ddd;border-radius:3px;">✎ Edit</button>
                <button class="add-tab-btn" style="padding:4px 8px;font-size:90%;cursor:pointer;background:#fff;border:1px solid #ddd;border-radius:3px;">+ Add</button>
                <button class="close-group-btn" style="padding:4px 8px;font-size:90%;cursor:pointer;background:#fee;border:1px solid #fcc;border-radius:3px;color:#c33;">Delete</button>
                <button class="remove-group-btn" style="padding:4px 8px;font-size:90%;cursor:pointer;background:#f0f0f0;border:1px solid #ddd;border-radius:3px;">Ungroup</button>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${tabs.map(t => `
                <div class="tab-item" style="
                  background:#fff;
                  border:1px solid #eee;
                  padding:8px;
                  border-radius:3px;
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  cursor:pointer;
                  transition:all 0.2s;
                " 
                data-tab-id="${t.id}">
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:90%;">
                    ${escapeHtml(t.title || t.url)}
                  </span>
                  <button class="close-tab-btn" style="
                    margin-left:8px;
                    padding:2px 6px;
                    font-size:85%;
                    cursor:pointer;
                    background:#fee;
                    border:1px solid #fcc;
                    border-radius:2px;
                    color:#c33;
                  ">✕</button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      html += '</div>';
      container.innerHTML = html;
      
      // Attach event listeners
      container.querySelectorAll('.tab-item').forEach(el => {
        const tabId = parseInt(el.dataset.tabId);
        
        // Click to focus tab
        el.addEventListener('click', async (e) => {
          if (e.target.closest('.close-tab-btn')) return; // Don't focus if clicking close button
          await focusTab(tabId);
        });
        
        // Hover effect
        el.addEventListener('mouseover', () => {
          el.style.background = '#f5f5f5';
          el.style.borderColor = '#ddd';
        });
        el.addEventListener('mouseout', () => {
          el.style.background = '#fff';
          el.style.borderColor = '#eee';
        });
        
        // Close button
        el.querySelector('.close-tab-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          await closeTab(tabId);
          el.remove();
        });
      });
      
      // Add tab buttons
      container.querySelectorAll('.add-tab-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const groupId = parseInt(btn.closest('.tab-group-item').dataset.groupId);
          // Prompt for URL
          const url = prompt('Enter URL to open in this tab group:');
          if (url) {
            try {
              console.log('Creating tab with URL:', url, 'and adding to group:', groupId);
              const newTab = await chrome.tabs.create({url, active: false});
              console.log('Tab created:', newTab.id);
              await chrome.tabs.group({tabIds: [newTab.id], groupId});
              console.log('Tab added to group');
              // Wait a moment for the tab to load and get its real title
              setTimeout(async () => {
                await render(containerId);
              }, 500);
            } catch (e) {
              console.error('Failed to add tab to group', e);
              alert('Failed to add tab: ' + e.message);
            }
          }
        });
      });
      
      // Edit group buttons
      container.querySelectorAll('.edit-group-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const groupId = parseInt(btn.closest('.tab-group-item').dataset.groupId);
          const group = await chrome.tabGroups.get(groupId);
          
          // Create edit modal
          const modal = document.createElement('div');
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          `;
          
          const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];
          const colorMap = {
            grey: '#999999',
            blue: '#2196F3',
            red: '#F44336',
            yellow: '#FFC107',
            green: '#4CAF50',
            pink: '#E91E63',
            purple: '#9C27B0',
            cyan: '#00BCD4'
          };
          
          const currentColor = group.color || 'grey';
          
          let colorHtml = colors.map(c => `
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
              cursor: pointer;
            ">
              <div style="
                width: 40px;
                height: 40px;
                background: ${colorMap[c]};
                border: ${c === currentColor ? '3px solid #000' : '2px solid #ddd'};
                border-radius: 4px;
                transition: all 0.2s;
              " class="color-option" data-color="${c}"></div>
              <span style="font-size: 80%;">${c}</span>
            </div>
          `).join('');
          
          modal.innerHTML = `
            <div style="
              background: white;
              border-radius: 8px;
              padding: 24px;
              max-width: 400px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            ">
              <h2 style="margin-top: 0; color: #333;">Edit Tab Group</h2>
              
              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">Group Name:</label>
                <input type="text" id="group-name" value="${escapeHtml(group.title || '')}" style="
                  width: 100%;
                  padding: 8px;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  font-size: 14px;
                  box-sizing: border-box;
                ">
              </div>
              
              <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 12px; font-weight: bold; color: #555;">Color:</label>
                <div style="
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 12px;
                ">
                  ${colorHtml}
                </div>
              </div>
              
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="cancel-btn" style="
                  padding: 8px 16px;
                  background: #f0f0f0;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  cursor: pointer;
                ">Cancel</button>
                <button id="save-btn" style="
                  padding: 8px 16px;
                  background: #2196F3;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                ">Save</button>
              </div>
            </div>
          `;
          
          document.body.appendChild(modal);
          
          let selectedColor = currentColor;
          
          // Color selection
          modal.querySelectorAll('.color-option').forEach(colorEl => {
            colorEl.addEventListener('click', () => {
              modal.querySelectorAll('.color-option').forEach(el => {
                el.style.border = '2px solid #ddd';
              });
              colorEl.style.border = '3px solid #000';
              selectedColor = colorEl.dataset.color;
            });
          });
          
          // Cancel button
          modal.querySelector('#cancel-btn').addEventListener('click', () => {
            modal.remove();
          });
          
          // Save button
          modal.querySelector('#save-btn').addEventListener('click', async () => {
            const newName = modal.querySelector('#group-name').value.trim();
            if (!newName) {
              alert('Please enter a group name');
              return;
            }
            try {
              await updateTabGroup(groupId, {
                title: newName,
                color: selectedColor
              });
              modal.remove();
              await render(containerId);
            } catch (e) {
              console.error('Failed to update group', e);
              alert('Failed to update group: ' + e.message);
            }
          });
        });
      });
      
      // Close group buttons
      container.querySelectorAll('.close-group-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const groupId = parseInt(btn.closest('.tab-group-item').dataset.groupId);
          if (confirm('Close all tabs in this group?')) {
            try {
              await closeTabGroup(groupId);
              await render(containerId);
            } catch (e) {
              console.error('Failed to close tab group', e);
              alert('Failed to close group: ' + e.message);
            }
          }
        });
      });
      
      // Remove group buttons
      container.querySelectorAll('.remove-group-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const groupId = parseInt(btn.closest('.tab-group-item').dataset.groupId);
          if (confirm('Ungroup all tabs? (tabs will remain open but no longer grouped)')) {
            try {
              await removeTabGroup(groupId);
              await render(containerId);
            } catch (e) {
              console.error('Failed to remove tab group', e);
              alert('Failed to ungroup: ' + e.message);
            }
          }
        });
      });    } catch (e) {
      console.error('TabGroupsService.render failed', e);
    }
  }
  
  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  
  function getTitleFromUrl(url) {
    try {
      const urlObj = new URL(url);
      // Return domain name as title
      return urlObj.hostname.replace('www.', '') || url;
    } catch (e) {
      // If URL parsing fails, return first 50 chars
      return url.substring(0, 50);
    }
  }
  
  const api = { getTabGroups, getGroupTabs, focusGroup, focusTab, closeTab, closeTabGroup, removeTabGroup, render };
  if (typeof window !== 'undefined') window.TabGroupsService = api;
  return api;
})();
