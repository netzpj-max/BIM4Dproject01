export const PROJECT_NAME='อาคารห้องพัก 4 ชั้น';
export const APP_NAME='NPAiRENDER Studio';
export const WORKSPACE_KEY='bim4dproject01-public-v1';
export const LEGACY_KEY='bim4dproject01-unused-legacy';
export function storeWorkspace(storage,data){
  const serialized=JSON.stringify(data),legacy=storage.getItem(LEGACY_KEY);
  try{storage.setItem(WORKSPACE_KEY,serialized);if(legacy)storage.removeItem(LEGACY_KEY);}
  catch(error){
    if(!legacy)throw error;
    // Reuse the old allocation; retain its bytes for rollback until commit succeeds.
    storage.removeItem(LEGACY_KEY);
    try{storage.setItem(WORKSPACE_KEY,serialized);}
    catch(retryError){storage.setItem(LEGACY_KEY,legacy);throw retryError;}
  }
}
export function renameText(value){return String(value??'');}
// Keep identifiers and geometry intact; rebrand descriptions and project metadata.
export function brandModel(model){
  model.project.name=PROJECT_NAME;model.project.application=APP_NAME;
  for(const collection of [model.elements,model.tasks,model.issues,model.archivedElements||[]]){
    for(const item of collection||[])for(const key of ['name','title','description','note','archiveReason'])if(typeof item[key]==='string')item[key]=renameText(item[key]);
  }
  return model;
}
