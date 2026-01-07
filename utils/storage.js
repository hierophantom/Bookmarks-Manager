const Storage = {
  get(key){
    return new Promise((res, reject) => {
      try {
        chrome.storage.local.get(key, data => {
          if (chrome.runtime.lastError) {
            console.error('Storage.get error', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log('Storage.get', {key, result: data[key]});
            res(data[key]);
          }
        });
      } catch (e) {
        console.error('Storage.get exception', e);
        reject(e);
      }
    });
  },
  
  set(obj){
    return new Promise((res, reject) => {
      try {
        console.log('Storage.set called with', obj);
        chrome.storage.local.set(obj, () => {
          if (chrome.runtime.lastError) {
            console.error('Storage.set error', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log('Storage.set callback fired successfully');
            res();
          }
        });
      } catch (e) {
        console.error('Storage.set exception', e);
        reject(e);
      }
    });
  },
  
  remove(key){
    return new Promise((res, reject) => {
      try {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            console.error('Storage.remove error', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            res();
          }
        });
      } catch (e) {
        console.error('Storage.remove exception', e);
        reject(e);
      }
    });
  }
};

// Test function to verify storage works
window.testStorage = async function(){
  console.log('=== Testing chrome.storage.local ===');
  await Storage.set({testKey: 'testValue'});
  const result = await Storage.get('testKey');
  console.log('Test result:', result);
  console.log('Test passed:', result === 'testValue');
};
