/**
 * file path and name: data/data.js
 * Search Categories and Results Management
 * 
 * This module handles the configuration and processing of search categories,
 * including result formatting and search operations across different data sources.
 * It serves as the data management layer for the Quick Search Extension.
 */

/*=============================================================================
  SEARCH CATEGORIES ENUM
=============================================================================*/

const SearchCategories = {
    SEARCH_ENGINE: 'search_engine',
    CALCULATOR: 'calculator',
    BOOKMARKS: 'bookmarks',
    DOWNLOADS: 'downloads',
    CHROME_SETTINGS: 'chrome_settings',
    HISTORY: 'history',
    EXTENSIONS: 'extensions'
};

const ICON_MAP = {
'🔍': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
  <g clip-path="url(#a)">
    <path fill="#" fill-rule="evenodd" d="M11.893 13.585a7.502 7.502 0 1 1 1.372-1.28l4.094 4.094a.938.938 0 1 1-1.326 1.326l-4.14-4.14Zm1.235-6.083a5.627 5.627 0 1 1-11.253 0 5.627 5.627 0 0 1 11.253 0Z" clip-rule="evenodd"/>
  </g>
</svg>`,

'⌛': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
  <g clip-path="url(#a)">
    <path fill="" fill-rule="evenodd" d="M18 9A9 9 0 1 1 0 9a9 9 0 0 1 18 0Zm-8.589 7.301a7.384 7.384 0 0 1-.822 0L7.588 12.8a10.41 10.41 0 0 1 2.824 0l-1 3.502Zm-3.474-3.138.798 2.792a7.316 7.316 0 0 1-3.13-2.018l2.104-.7c.076-.026.152-.05.228-.074Zm4.918-2.005c-1.23-.19-2.48-.19-3.71 0a10.406 10.406 0 0 1-.165-1.033h4.04c-.037.346-.093.69-.165 1.033Zm.21-2.72h-4.13c.028-.536.098-1.069.21-1.596 1.23.19 2.48.19 3.71 0 .112.527.182 1.06.21 1.596Zm1.651 1.687c-.044.472-.116.942-.215 1.408.108.032.216.067.323.102l2.598.866a7.264 7.264 0 0 0 .805-2.376h-3.51Zm3.575-1.688h-3.536c-.03-.66-.115-1.32-.255-1.97.109-.032.217-.067.324-.102l2.598-.866c.483.885.789 1.88.87 2.939Zm-11.046 0c.03-.66.115-1.32.255-1.97a12.098 12.098 0 0 1-.324-.102l-2.598-.866a7.267 7.267 0 0 0-.87 2.939h3.537Zm-3.471 1.688c.13.85.408 1.65.804 2.376l2.598-.866c.107-.035.215-.07.324-.103-.1-.465-.172-.935-.216-1.407h-3.51Zm8.638-4.924c-.937.129-1.887.129-2.824 0l1-3.502a7.434 7.434 0 0 1 .823 0L10.412 5.2Zm-4.475-.364.798-2.792a7.317 7.317 0 0 0-3.13 2.018l2.104.7c.076.026.152.05.228.074Zm6.126 8.326-.798 2.792a7.317 7.317 0 0 0 3.129-2.018l-2.103-.7a9.707 9.707 0 0 0-.228-.074Zm.228-8.4 2.103-.7a7.317 7.317 0 0 0-3.129-2.018l.798 2.792.228-.073Z" clip-rule="evenodd"/>
  </g>
</svg>`,

'🔖': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
  <g clip-path="url(#a)">
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
  </g>
</svg>`,

'⬇️': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
  <g clip-path="url(#a)">
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
  </g>
</svg>
`,

'🧩': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
  <g clip-path="url(#a)">
    <path fill="" fill-rule="evenodd" d="M18 4.802c0-.662-.538-1.2-1.2-1.2h-3.06A2.99 2.99 0 0 0 12.668.655 2.999 2.999 0 0 0 7.863 2.39c-.08.399-.08.81 0 1.21H4.802c-.662.002-1.2.539-1.2 1.2v3.062a3 3 0 0 0-2.758.855 3.001 3.001 0 0 0 1.29 4.958 3.03 3.03 0 0 0 1.468.062V16.8c0 .662.538 1.199 1.2 1.2H16.8a1.202 1.202 0 0 0 1.2-1.2v-3.924a.6.6 0 0 0-.9-.52 1.801 1.801 0 0 1-1.434.167 1.772 1.772 0 0 1-1.216-1.288 1.803 1.803 0 0 1 .342-1.555 1.821 1.821 0 0 1 2.309-.435.6.6 0 0 0 .899-.52V4.802Zm-1.929 2.28V5.531h-4.699l.478-2.318c.04-.192.025-.392-.042-.578v-.001a1.06 1.06 0 0 0-.338-.469l-.004-.003a1.07 1.07 0 0 0-.986-.185m5.591 5.105a3.744 3.744 0 0 0-2.775 1.38l-.01.014a3.731 3.731 0 0 0-.71 3.212 3.7 3.7 0 0 0 2.531 2.681c.316.096.64.149.964.16v1.542H5.531v-4.696l-2.316.474a1.06 1.06 0 0 1-1.256-.79v-.005a1.073 1.073 0 0 1 1.258-1.301l2.314.47V5.532h4.688l-.466-2.31a1.133 1.133 0 0 1 .022-.537 1.07 1.07 0 0 1 .705-.707" clip-rule="evenodd"/>
  </g>
</svg>`,

'👀': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
  <g clip-path="url(#a)">
    <path fill="" fill-rule="evenodd" d="M18 4.802c0-.662-.538-1.2-1.2-1.2h-3.06A2.99 2.99 0 0 0 12.668.655 2.999 2.999 0 0 0 7.863 2.39c-.08.399-.08.81 0 1.21H4.802c-.662.002-1.2.539-1.2 1.2v3.062a3 3 0 0 0-2.758.855 3.001 3.001 0 0 0 1.29 4.958 3.03 3.03 0 0 0 1.468.062V16.8c0 .662.538 1.199 1.2 1.2H16.8a1.202 1.202 0 0 0 1.2-1.2v-3.924a.6.6 0 0 0-.9-.52 1.801 1.801 0 0 1-1.434.167 1.772 1.772 0 0 1-1.216-1.288 1.803 1.803 0 0 1 .342-1.555 1.821 1.821 0 0 1 2.309-.435.6.6 0 0 0 .899-.52V4.802Zm-1.929 2.28V5.531h-4.699l.478-2.318c.04-.192.025-.392-.042-.578v-.001a1.06 1.06 0 0 0-.338-.469l-.004-.003a1.07 1.07 0 0 0-.986-.185m5.591 5.105a3.744 3.744 0 0 0-2.775 1.38l-.01.014a3.731 3.731 0 0 0-.71 3.212 3.7 3.7 0 0 0 2.531 2.681c.316.096.64.149.964.16v1.542H5.531v-4.696l-2.316.474a1.06 1.06 0 0 1-1.256-.79v-.005a1.073 1.073 0 0 1 1.258-1.301l2.314.47V5.532h4.688l-.466-2.31a1.133 1.133 0 0 1 .022-.537 1.07 1.07 0 0 1 .705-.707" clip-rule="evenodd"/>
  </g>
</svg>`,

'🔢': `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 0C4.0275 0 0 4.0275 0 9C0 13.9725 4.0275 18 9 18C13.9725 18 18 13.9725 18 9C18 4.0275 13.9725 0 9 0ZM11.7 11.7H6.3C5.805 11.7 5.4 11.295 5.4 10.8C5.4 10.305 5.805 9.9 6.3 9.9H11.7C12.195 9.9 12.6 10.305 12.6 10.8C12.6 11.295 12.195 11.7 11.7 11.7ZM11.7 8.1H6.3C5.805 8.1 5.4 7.695 5.4 7.2C5.4 6.705 5.805 6.3 6.3 6.3H11.7C12.195 6.3 12.6 6.705 12.6 7.2C12.6 7.695 12.195 8.1 11.7 8.1Z" fill=""/>
</svg>

`,

'⚙️': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18">
  <g clip-path="url(#a)">
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
    <path fill="" d="M9 0a8.995 8.995 0 0 0-6.364 2.636 8.995 8.995 0 0 0 0 12.728 8.995 8.995 0 0 0 12.728 0 8.995 8.995 0 0 0-.003-12.725A9.003 9.003 0 0 0 9 0Zm0 16.727A7.727 7.727 0 1 1 16.726 9a7.731 7.731 0 0 1-2.266 5.46A7.731 7.731 0 0 1 9 16.727Z"/>
    <path fill="" d="M9 5.179a3.821 3.821 0 1 0 .002 7.643A3.821 3.821 0 0 0 9 5.179Zm0 6.368a2.548 2.548 0 1 1 0-5.096 2.548 2.548 0 0 1 0 5.096Z"/>
    <path fill="" d="M16.734 5.179H9a.637.637 0 0 0 0 1.273h7.734a.637.637 0 1 0 0-1.273Zm-9.935 5.095-3.87-6.695a.639.639 0 0 0-1.106.636l3.821 6.624.041.074a.642.642 0 1 0 1.114-.639Zm5.291-.227a.638.638 0 0 0-.876.214l-3.878 6.71a.64.64 0 0 0 .235.872.635.635 0 0 0 .869-.235l3.821-6.624.036-.059a.639.639 0 0 0-.207-.878Z"/>
  </g>
</svg>
`
};

/*=============================================================================
  UTILITY FUNCTIONS
=============================================================================*/

/**
 * Generates search URL based on query and search engine
 * @param {string} query - Search query
 * @param {string} searchEngine - Search engine name
 * @returns {string} - Search URL
 */
function getSearchUrl(query, searchEngine) {
    const encodedQuery = encodeURIComponent(query);
    const searchUrls = {
        'google': `https://www.google.com/search?q=${encodedQuery}`,
        'bing': `https://www.bing.com/search?q=${encodedQuery}`,
        'duckduckgo': `https://duckduckgo.com/?q=${encodedQuery}`,
        'brave': `https://search.brave.com/search?q=${encodedQuery}`,
        'yahoo': `https://search.yahoo.com/search?p=${encodedQuery}`
    };
    return searchUrls[searchEngine] || searchUrls['google'];
}

/**
 * Performs search using selected search engine
 * @param {string} query - Search query
 * @param {Object} settings - User settings
 */
function performSearch(query, settings) {
    const searchUrl = getSearchUrl(query, settings.searchEngine);
    chrome.runtime.sendMessage({
        action: "open_chrome_url",
        url: searchUrl
    });
}

/*=============================================================================
  RESULT FORMATTING
=============================================================================*/

/**
 * Formats search results for display
 * @param {Object} results - Raw search results
 * @returns {Array} - Formatted suggestions
 */
function formatResults(results) {
    const suggestions = [];
    
    Object.entries(results).forEach(([category, data]) => {
        if (data?.items?.length) {
            const config = CategoryConfig[category];
            const resultConfig = config.resultConfig;
            
            let itemsToShow = data.items;
            if (resultConfig.limit > 0) {
                itemsToShow = data.items.slice(0, resultConfig.limit);
            }

            // Add regular items
            suggestions.push(...itemsToShow.map(item => ({
                type: data.type,
                icon: ICON_MAP[item.icon] || item.icon,
                text: item.text || 'No title',
                subtitle: item.subtitle || '',
                action: item.action
            })));

            // Add "Show more" button if configured and needed
            if (resultConfig.showMore && 
                resultConfig.limit > 0 && 
                data.items.length > resultConfig.limit) {
                suggestions.push({
                    type: data.type,
                    icon: ICON_MAP['👀'] || '👀',
                    text: `Show more ${data.type.toLowerCase()} results (${data.items.length - resultConfig.limit} more)`,
                    subtitle: `Open Chrome ${data.type}`,
                    action: () => chrome.runtime.sendMessage({
                        action: "open_chrome_url",
                        url: `chrome://${data.type.toLowerCase()}`
                    })
                });
            }
        }
    });

    return suggestions;
}


/*=============================================================================
  CATEGORY CONFIGURATIONS
=============================================================================*/

const CategoryConfig = {
    [SearchCategories.SEARCH_ENGINE]: {
        icon: ICON_MAP['🔍'],
        title: 'Search',
        priority: 1,
        enabled: true,
        resultConfig: {
            limit: 0,
            showMore: false
        },
        search: async (query, settings) => [{
            icon: ICON_MAP['🔍'],
            text: `Search for "${query}" in ${settings.searchEngine}`,
            subtitle: '',
            action: () => performSearch(query, settings)
        }]
    },

    [SearchCategories.CALCULATOR]: {
        icon: '🔢',
        title: 'Calculate',
        priority: 0,
        enabled: true,
        resultConfig: {
            limit: 1,
            showMore: false
        },
        search: async (query) => {
            // Check if the query contains any mathematical operators
            if (!/[-+/*().\d]/.test(query)) {
                return [];
            }

            try {
                const result = calculateExpression(query);
                if (result !== null) {
                    return [{
                        icon: '🔢',
                        text: `${query} = ${result.toLocaleString()}`, // Use toLocaleString for better number formatting
                        subtitle: 'Click to copy result',
                        action: () => copyToClipboard(result.toString()),
                        hoverIcon: ICON_MAP['copy'],
                        hoverText: 'Copy to clipboard'
                    }];
                }
            } catch (error) {
                console.error('Calculator error:', error);
            }
            return [];
        }
    },

    [SearchCategories.HISTORY]: {
        icon: '⌛',
        title: 'History',
        priority: 2,
        enabled: true,
        resultConfig: {
            limit: 5,
            showMore: true
        },
        search: async (query, settings) => {
            try {
                const results = await chrome.runtime.sendMessage({
                    action: "search_history",
                    query: query
                });
                
                return results.map(item => ({
                    icon: '⌛',
                    text: item.title || item.url,
                    subtitle: item.url,
                    action: () => chrome.runtime.sendMessage({
                        action: "open_chrome_url",
                        url: item.url
                    })
                }));
            } catch (error) {
                console.error('Error searching history:', error);
                return [];
            }
        }
    },

    [SearchCategories.DOWNLOADS]: {
        icon: '⬇️',
        title: 'Downloads',
        priority: 3,
        enabled: true,
        resultConfig: {
            limit: 5,
            showMore: true
        },
        search: async (query, settings) => {
            try {
                const results = await chrome.runtime.sendMessage({
                    action: "search_downloads",
                    query: query
                });
                
                return results.map(item => ({
                    icon: '⬇️',
                    text: item.filename.split(/[/\\]/).pop() || 'Unknown file',
                    subtitle: `Downloaded: ${new Date(item.startTime).toLocaleDateString()}`,
                    action: () => chrome.runtime.sendMessage({
                        action: "open_download",
                        id: item.id
                    })
                }));
            } catch (error) {
                console.error('Error searching downloads:', error);
                return [];
            }
        }
    },

    [SearchCategories.BOOKMARKS]: {
        icon: '🔖',
        title: 'Bookmarks',
        priority: 4,
        enabled: true,
        resultConfig: {
            limit: 5,
            showMore: true
        },
        search: async (query, settings) => {
            try {
                const results = await chrome.runtime.sendMessage({
                    action: "search_bookmarks",
                    query: query
                });
                
                return results.map(item => ({
                    icon: '🔖',
                    text: item.title || item.url,
                    subtitle: item.url,
                    action: () => chrome.runtime.sendMessage({
                        action: "open_chrome_url",
                        url: item.url
                    })
                }));
            } catch (error) {
                console.error('Error searching bookmarks:', error);
                return [];
            }
        }
    },

    [SearchCategories.CHROME_SETTINGS]: {
        icon: '⚙️',
        title: 'Settings',
        priority: 5,
        enabled: true,
        resultConfig: {
            limit: 0,
            showMore: false
        },
        search: async (query, settings) => {
            try {
                const results = await chrome.runtime.sendMessage({
                    action: "search_settings",
                    query: query
                });
                
                return results.map(item => ({
                    icon: '⚙️',
                    text: item.title,
                    subtitle: item.description,
                    action: () => chrome.runtime.sendMessage({
                        action: "open_chrome_url",
                        url: item.url
                    })
                }));
            } catch (error) {
                console.error('Error searching settings:', error);
                return [];
            }
        }
    },

    [SearchCategories.EXTENSIONS]: {
        icon: '🧩',
        title: 'Extensions',
        priority: 6,
        enabled: true,
        resultConfig: {
            limit: 0,
            showMore: false
        },
        search: async (query, settings) => {
            try {
                const results = await chrome.runtime.sendMessage({
                    action: "search_extensions",
                    query: query
                });
                
                return results.map(item => ({
                    icon: '🧩',
                    text: item.name,
                    subtitle: item.description,
                    action: () => chrome.runtime.sendMessage({
                        action: "open_chrome_url",
                        url: `chrome://extensions/?id=${item.id}`
                    })
                }));
            } catch (error) {
                console.error('Error searching extensions:', error);
                return [];
            }
        }
    }
};

/*=============================================================================
  SEARCH OPERATIONS
=============================================================================*/

/**
 * Searches across all enabled categories
 * @param {string} query - The search query
 * @param {Object} settings - User settings
 * @returns {Promise<Array>} - Array of categorized results
 */
async function searchAll(query, settings) {
    const results = {};
    
    try {
        const categorySettings = settings.categorySettings || {};
        
        // Create an array of promises with their respective categories
        const searchPromises = Object.entries(CategoryConfig)
            .filter(([category, config]) => {
                // Always include search engine category
                if (category === SearchCategories.SEARCH_ENGINE) return true;
                
                // Check if category is enabled in settings
                return categorySettings[category]?.enabled ?? config.enabled;
            })
            .map(async ([category, config]) => {
                try {
                    const categoryResults = await config.search(query, settings);
                    if (categoryResults?.length) {
                        return {
                            category,
                            results: {
                                type: config.title,
                                items: categoryResults
                            }
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error searching ${category}:`, error);
                    return null;
                }
            });

        // Wait for all searches to complete
        const searchResults = await Promise.all(searchPromises);
        
        // Filter out null results and sort by priority
        searchResults
            .filter(result => result !== null)
            .sort((a, b) => {
                const priorityA = categorySettings[a.category]?.priority ?? 
                                CategoryConfig[a.category].priority;
                const priorityB = categorySettings[b.category]?.priority ?? 
                                CategoryConfig[b.category].priority;
                return priorityA - priorityB;
            })
            .forEach(result => {
                results[result.category] = result.results;
            });

        return results;
    } catch (error) {
        console.error('Error in searchAll:', error);
        return {};
    }
}

// Calculator utilities
function calculateExpression(input) {
    // Remove spaces and validate input
    input = input.replace(/\s+/g, '');
    
    // Early return checks for invalid inputs
    if (input.includes('()')) return null;
    if (input.match(/\(\s*\)/)) return null;
    if (!/[-+/*().\d]/.test(input)) return null;

    try {
        // Use math.js to evaluate the expression
        const result = math.evaluate(input);
        
        // Return null if result is not finite
        if (!Number.isFinite(result)) {
            return null;
        }
        
        // Round to 8 decimal places to avoid floating point issues
        return Math.round(result * 1e8) / 1e8;
    } catch (e) {
        console.error('Calculator error:', e);
        return null;
    }
}

// Clipboard utility
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Optional: Show a notification that the result was copied
        chrome.runtime.sendMessage({
            action: "show_notification",
            message: "Result copied to clipboard"
        });
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}
