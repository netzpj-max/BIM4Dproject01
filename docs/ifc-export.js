// IFC2x3 swept-solid exchange. Units and stable GlobalIds match model.json.
import {PROJECT_NAME,APP_NAME,brandModel} from './branding.js';
const Q=s=>"'"+String(s??'').replace(/'/g,"''").replace(/[^\x20-\x7e]/g,c=>'\\X2\\'+c.charCodeAt(0).toString(16).padStart(4,'0').toUpperCase()+'\\X0\\')+"'";
const N=x=>Number.isFinite(+x)?((+x).toFixed(6).replace(/0+$/,'').replace(/\.$/,'.')):'0.';
export function exportIFC(model){
 model=brandModel(structuredClone(model));
 let rows=[],i=0;const a=(type,args)=>{rows.push(`#${++i}=${type.toUpperCase()}(${args});`);return '#'+i},list=x=>'('+x.join(',')+')';
 const revision=model.project.revisionCode||'R00';
 const person=a('IfcPerson',"$,$,'Model Coordinator',$,$,$,$,$"),org=a('IfcOrganization',`$,${Q(APP_NAME)},$,$,$`),user=a('IfcPersonAndOrganization',`${person},${org},$`),app=a('IfcApplication',`${org},${Q(revision)},${Q(APP_NAME+' BIM')},'NPAIBIM'`),owner=a('IfcOwnerHistory',`${user},${app},$,.ADDED.,$,$,$,1791590400`);
 const point=xyz=>a('IfcCartesianPoint',list(xyz.map(N))),dir=xyz=>a('IfcDirection',list(xyz.map(N))),zdir=dir([0,0,1]),xdir=dir([1,0,0]);
 const axis=(xyz=[0,0,0],zd=zdir,xd=xdir)=>a('IfcAxis2Placement3D',`${point(xyz)},${zd},${xd}`),zeroaxis=axis(),world=a('IfcLocalPlacement',`$,${zeroaxis}`),ctx=a('IfcGeometricRepresentationContext',"$,'Model',3,0.00001,"+zeroaxis+",$"),metre=a('IfcSIUnit',"*,.LENGTHUNIT.,$,.METRE."),area=a('IfcSIUnit',"*,.AREAUNIT.,$,.SQUARE_METRE."),vol=a('IfcSIUnit',"*,.VOLUMEUNIT.,$,.CUBIC_METRE."),units=a('IfcUnitAssignment',list([metre,area,vol]));
 const root=(id,name,desc='')=>`${Q(String(id).padEnd(22,'0').slice(0,22))},${owner},${Q(name)},${Q(desc)},$`;
 const project=a('IfcProject',root('0ProjectResidential001',PROJECT_NAME,model.project.description)+`, $,$,${list([ctx])},${units}`),site=a('IfcSite',root('0SiteResidential000001',PROJECT_NAME+' / พื้นที่อาคาร')+`,${world},$,$,.ELEMENT.,$,$,$,$,$`),buildingPlacement=a('IfcLocalPlacement',`${world},${zeroaxis}`),building=a('IfcBuilding',root('0BuildResidential00001',PROJECT_NAME)+`,${buildingPlacement},$,$,.ELEMENT.,$,$,$`);
 let gid=0;const rel=(type,parent,children)=>a(type,`${Q(('0Relationship'+String(++gid).padStart(9,'0')).slice(0,22))},${owner},$,$,${parent},${list(children)}`);
 rel('IfcRelAggregates',project,[site]);rel('IfcRelAggregates',site,[building]);let storeys={},contained={},mapped={};
 for(const l of model.levels){const lp=a('IfcLocalPlacement',`${buildingPlacement},${zeroaxis}`);storeys[l.id]=a('IfcBuildingStorey',root(('0Storey'+l.id+'0000000000000000').slice(0,22),l.name)+`,${lp},$,$,.ELEMENT.,${N(l.elevation)}`);contained[l.id]=[];}
 rel('IfcRelAggregates',building,Object.values(storeys));
 const prop=(name,value,type='IfcLabel')=>a('IfcPropertySingleValue',`${Q(name)},$,${type.toUpperCase()}(${type==='IfcReal'||type==='IfcLengthMeasure'?N(value):Q(value)}),$`);
 const pset=(ref,name,props)=>{const ps=a('IfcPropertySet',`${Q(('0PropertySet'+String(++gid).padStart(10,'0')).slice(0,22))},${owner},${Q(name)},$,${list(props)}`);a('IfcRelDefinesByProperties',`${Q(('0PropertyRel'+String(++gid).padStart(10,'0')).slice(0,22))},${owner},$,$,${list([ref])},${ps}`)};
 const types={Footing:'IfcFooting',Pile:'IfcBuildingElementProxy',Column:'IfcColumn',Beam:'IfcBeam',Member:'IfcMember',Railing:'IfcRailing',FlowSegment:'IfcFlowSegment',Slab:'IfcSlab',Wall:'IfcWall',Door:'IfcDoor',Window:'IfcWindow',Roof:'IfcRoof',Covering:'IfcCovering',FurnishingElement:'IfcFurnishingElement',Space:'IfcSpace',StairFlight:'IfcStairFlight',ReinforcingBar:'IfcReinforcingBar',PipeSegment:'IfcFlowSegment',DuctSegment:'IfcFlowSegment',CableCarrierSegment:'IfcFlowSegment',FlowTerminal:'IfcFlowTerminal',SanitaryTerminal:'IfcFlowTerminal',LightFixture:'IfcFlowTerminal',AirTerminal:'IfcFlowTerminal',Fan:'IfcFlowMovingDevice',Tank:'IfcFlowStorageDevice',ElectricDistributionBoard:'IfcFlowController'};
 const profileAxis=a('IfcAxis2Placement2D',`${point([0,0])},$`);
 for(const e of model.elements){
  let zd=[0,0,1],xd=[Math.cos(e.angle||0),Math.sin(e.angle||0),0],origin=[...e.pos];let [w,d,h]=e.size;
  if(e.endpoints){const [p,b]=e.endpoints;zd=b.map((v,j)=>(v-p[j])/h);let x=Math.abs(zd[2])>.95?[1,0,0]:[-zd[1],zd[0],0];let len=Math.hypot(...x);xd=x.map(v=>v/len);origin=p;}
  else if(e.axis){zd=e.axis.z;xd=e.axis.x;origin=origin.map((v,j)=>v-zd[j]*h/2);}
  else if(e.rotationX){zd=[0,-Math.sin(e.rotationX),Math.cos(e.rotationX)];origin=origin.map((v,j)=>v-zd[j]*h/2);}
  else origin[2]-=h/2;
  const placement=a('IfcLocalPlacement',`${world},${axis(origin,dir(zd),dir(xd))}`);let profile;
  if(e.shape==='cylinder')profile=a('IfcCircleProfileDef',`.AREA.,$,${profileAxis},${N(w/2)}`);
  else if(e.points){const p=e.points.map(p=>point(p));p.push(p[0]);profile=a('IfcArbitraryClosedProfileDef',`.AREA.,$,${a('IfcPolyline',list(p))}`)}
  else profile=a('IfcRectangleProfileDef',`.AREA.,$,${profileAxis},${N(w)},${N(d)}`);
  const solid=a('IfcExtrudedAreaSolid',`${profile},${zeroaxis},${zdir},${N(h)}`),representation=a('IfcShapeRepresentation',`${ctx},'Body','SweptSolid',${list([solid])}`),shape=a('IfcProductDefinitionShape',`$,$,${list([representation])}`);
  let suffix='';if(e.type==='Door'||e.type==='Window')suffix=`,${N(h)},${N(w)}`;if(e.type==='Footing')suffix=',.PILE_CAP.';if(e.type==='Pile')suffix=',.ELEMENT.';if(e.type==='Slab')suffix=',.FLOOR.';if(e.type==='Railing')suffix=e.name.includes('handrail')?',.HANDRAIL.':',.GUARDRAIL.';if(e.type==='Roof')suffix=',.GABLE_ROOF.';if(e.type==='Covering')suffix=e.name.includes('ceiling')?',.CEILING.':',.FLOORING.';if(e.type==='StairFlight')suffix=`,${e.risers??'$'},${e.treads??'$'},${e.riserHeight==null?'$':N(e.riserHeight)},${e.treadLength==null?'$':N(e.treadLength)}`;if(e.type==='ReinforcingBar')suffix=`,${Q(e.tag)},${N(w)},${N(Math.PI*w*w/4)},${N(h)},.MAIN.,.PLAIN.`;
  const ifctype=types[e.type]||'IfcBuildingElementProxy';let args=root(e.guid,e.name,e.note)+`,${placement},${shape},${Q(e.id)}`+suffix;
  if(e.type==='Space')args=root(e.guid,e.name,e.note)+`,${placement},${shape},${Q(e.tag)},.ELEMENT.,.INTERNAL.,$`;
  const ref=a(ifctype,args);mapped[e.id]=ref;contained[e.level]?.push(ref);
  pset(ref,'NPAiBIM_Evidence',[prop('ElementId',e.id),prop('Discipline',e.discipline),prop('OriginalType',e.type),prop('Level',e.level),prop('SourceSheets',e.source.join('; ')),prop('ReviewStatus',e.status),prop('TaskId',e.task),prop('Material',e.material),prop('Quantity',e.quantity,'IfcReal'),prop('QuantityUnit',e.unit),prop('Progress',e.progress??0,'IfcReal'),prop('GeometryBasis',e.note||'Drawing reconstruction; verification required')]);
 }
 for(const [l,refs] of Object.entries(contained))if(refs.length)a('IfcRelContainedInSpatialStructure',`${Q(('0ContainRel'+String(++gid).padStart(11,'0')).slice(0,22))},${owner},$,$,${list(refs)},${storeys[l]}`);
 for(const t of model.tasks){const task=a('IfcTask',root(('0Task'+t.id.replace(/-/g,'')+'00000000000000000').slice(0,22),t.name,'Proposed relative construction programme')+`,${Q(t.id)},'PROPOSED',$,.F.,$`);pset(task,'NPAiBIM_4D',[prop('StartDay',t.start,'IfcReal'),prop('EndDay',t.end,'IfcReal'),prop('Dependencies',t.depends.join(';')),prop('Basis',t.basis),prop('Progress',t.progress,'IfcReal')]);const refs=model.elements.filter(e=>e.task===t.id).map(e=>mapped[e.id]);if(refs.length)a('IfcRelAssignsToProcess',`${Q(('0TaskAssign'+String(++gid).padStart(11,'0')).slice(0,22))},${owner},$,$,${list(refs)},$,${task},$`);}
 return `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ViewDefinition [CoordinationView_V2.0]','${revision} review draft; completeness not certified'),'2;1');\nFILE_NAME(${Q(PROJECT_NAME+'-'+revision+'.ifc')},'2026-10-11T00:00:00',(${Q(APP_NAME)}),(${Q(PROJECT_NAME)}),${Q(APP_NAME)},${Q(APP_NAME)},'');\nFILE_SCHEMA(('IFC2X3'));\nENDSEC;\nDATA;\n${rows.join('\n')}\nENDSEC;\nEND-ISO-10303-21;`;
}
