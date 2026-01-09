/*
File name & path: root/service-bookmark/tag-manager.js
Role: Tag management system using Tagify library for bookmarks
Method: Manages tag creation, suggestion, filtering, and integration with bookmark enhancement service
*/

class TagManager {
    constructor(enhancementService) {
        if (!enhancementService) {
            throw new Error('Enhancement service is required for TagManager');
        }
        
        this.enhancementService = enhancementService;
        this.tagifyInstances = new Map();
        this.allTags = new Set();
        this.isInitialized = false;

    }

    async init() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            await this.loadAllTags();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize TagManager:', error);
            throw error;
        }
    }

    async loadAllTags() {
        try {
            // Make sure enhancement service is available
            if (!this.enhancementService || typeof this.enhancementService.getAllEnhancements !== 'function') {
                console.warn('Enhancement service not available or missing getAllEnhancements method');
                return;
            }

            const allEnhancements = await this.enhancementService.getAllEnhancements();
            this.allTags.clear();
            
            Object.values(allEnhancements).forEach(enhancement => {
                if (enhancement.tags && Array.isArray(enhancement.tags)) {
                    enhancement.tags.forEach(tag => this.allTags.add(tag));
                }
            });
            
        } catch (error) {
            console.error('Failed to load all tags:', error);
        }
    }

    getTagsArray() {
        return Array.from(this.allTags).sort();
    }

    createTagifyInstance(inputElement, options = {}) {
        if (!inputElement) {
            console.error('Input element is required for createTagifyInstance');
            return null;
        }

        // Check if Tagify is available
        if (typeof Tagify === 'undefined') {
            console.error('Tagify library is not loaded');
            return null;
        }

        const defaultOptions = {
            whitelist: this.getTagsArray(),
            maxTags: 20,
            dropdown: {
                maxItems: 10,
                classname: 'tags-dropdown',
                enabled: 0,
                closeOnSelect: false
            },
            editTags: false,
            duplicates: false,
            trim: true,
            placeholder: 'Add tags...',
            originalInputValueFormat: valuesArr => valuesArr.map(item => item.value).join(','),
            templates: {
                tag: function(tagData) {
                    return `<tag title="${tagData.value}" 
                                contenteditable='false' 
                                spellcheck='false' 
                                class='tagify__tag'>
                        <div><span class='tagify__tag-text'># ${tagData.value}</span></div>
                    
                        <svg width="12" height="12" title='remove tag' class='tagify__tag__removeBtn'>
                            <use href="#close-icon" />
                        </svg>
                    </tag>`;
                }
            },
            ...options
        };

        try {
            // Destroy any existing Tagify instance on this element
            if (inputElement.tagify) {
                inputElement.tagify.destroy();
            }

            const tagify = new Tagify(inputElement, defaultOptions);
            
            // Store instance for cleanup
            this.tagifyInstances.set(inputElement, tagify);

            // Ensure original input is properly hidden
            inputElement.style.display = 'none';
            
            // Update whitelist when new tags are added
            tagify.on('add', (e) => {
                const newTag = e.detail.data.value;
                if (!this.allTags.has(newTag)) {
                    this.allTags.add(newTag);
                    this.updateAllTagifyWhitelists();
                }
            });

            return tagify;
        } catch (error) {
            console.error('Failed to create Tagify instance:', error);
            return null;
        }
    }

    updateAllTagifyWhitelists() {
        const tagsArray = this.getTagsArray();
        this.tagifyInstances.forEach(tagify => {
            if (tagify && typeof tagify.whitelist !== 'undefined') {
                tagify.whitelist = tagsArray;
            }
        });
    }

    destroyTagifyInstance(inputElement) {
        const tagify = this.tagifyInstances.get(inputElement);
        if (tagify && typeof tagify.destroy === 'function') {
            tagify.destroy();
            this.tagifyInstances.delete(inputElement);
        }
    }

    async addTagToBookmark(bookmarkId, tag) {
        if (!this.enhancementService) {
            throw new Error('Enhancement service not available');
        }

        try {
            await this.enhancementService.addTag(bookmarkId, tag);
            this.allTags.add(tag);
            this.updateAllTagifyWhitelists();
        } catch (error) {
            console.error('Failed to add tag to bookmark:', error);
            throw error;
        }
    }

    async removeTagFromBookmark(bookmarkId, tag) {
        if (!this.enhancementService) {
            throw new Error('Enhancement service not available');
        }

        try {
            await this.enhancementService.removeTag(bookmarkId, tag);
            // Check if tag is still used elsewhere before removing from allTags
            await this.loadAllTags();
            this.updateAllTagifyWhitelists();
        } catch (error) {
            console.error('Failed to remove tag from bookmark:', error);
            throw error;
        }
    }

    async setBookmarkTags(bookmarkId, tags) {
        if (!this.enhancementService) {
            throw new Error('Enhancement service not available');
        }

        try {
            const enhancement = await this.enhancementService.getEnhancement(bookmarkId) || {};
            enhancement.tags = Array.isArray(tags) ? tags : [];
            
            const itemType = enhancement.itemType || await this.enhancementService.detectItemType(bookmarkId);
            await this.enhancementService.setEnhancement(bookmarkId, enhancement, itemType);
            
            // Update global tags list only with non-empty tags
            if (tags && tags.length > 0) {
                tags.forEach(tag => this.allTags.add(tag));
            }
            this.updateAllTagifyWhitelists();
            
        } catch (error) {
            console.error('Failed to set bookmark tags:', error);
            throw error;
        }
    }

    async getBookmarkTags(bookmarkId) {
        if (!this.enhancementService) {
            console.warn('Enhancement service not available');
            return [];
        }

        try {
            const enhancement = await this.enhancementService.getEnhancement(bookmarkId);
            return enhancement?.tags || [];
        } catch (error) {
            console.error('Failed to get bookmark tags:', error);
            return [];
        }
    }


}

// Export for use in other modules
export { TagManager };
