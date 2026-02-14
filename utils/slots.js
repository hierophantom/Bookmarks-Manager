const SlotSystem = (()=>{
  async function load(key){
    const data = await Storage.get(key);
    return Array.isArray(data) ? data : null;
  }
  async function save(key, arr){
    return Storage.set({[key]: arr});
  }
  async function ensureSlots(key, count){
    let arr = await load(key);
    if (!arr || !Array.isArray(arr)){
      arr = new Array(count).fill(null);
      await save(key, arr);
    } else if (arr.length < count) {
      // Expand array if current length is less than requested count
      arr = arr.concat(new Array(count - arr.length).fill(null));
      await save(key, arr);
    } else if (arr.length > count) {
      // Shrink array if current length is more than requested count
      arr = arr.slice(0, count);
      await save(key, arr);
    }
    return arr;
  }
  async function setSlot(key, index, item){
    const arr = await ensureSlots(key, index+1);
    arr[index] = item;
    await save(key, arr);
  }
  async function clearSlot(key, index){
    const arr = await load(key) || [];
    if (index < 0 || index >= arr.length) return;
    arr[index] = null;
    await save(key, arr);
  }
  async function getSlots(key){
    return (await load(key)) || [];
  }
  return { ensureSlots, setSlot, clearSlot, getSlots, load, save };
})();
