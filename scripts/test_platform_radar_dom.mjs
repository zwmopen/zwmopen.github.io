import assert from 'node:assert/strict';
import {enrichUsersFromDom} from './platform_radar_dom.mjs';

const users=[
  {name:'小小的躺赢',rawId:'bcb4467089bb3157a695',avatarUrl:null,profileUrl:null},
  {name:'Arrebol',rawId:'579639784',avatarUrl:null,profileUrl:null},
  {name:'已有头像',rawId:'known',avatarUrl:'https://example.com/existing.png',profileUrl:null}
];
const hints=[
  {text:'小小的躺赢\n@btctangying\n总收益\n收益率\n跟单者',avatarUrl:'https://img.bgstatic.com/otc/images/20230723/avatar.webp',links:[]},
  {text:'Arrebol\n30日收益\n最大回撤\n带单规模',avatarUrl:'https://d1x7dwosqaosdj.cloudfront.net/images/2026-08/arrebol.jpeg',links:['https://official.example/trader/arrebol']},
  {text:'已有头像\n收益率\n跟单者',avatarUrl:'https://example.com/should-not-replace.png',links:[]}
];

const result=enrichUsersFromDom(users,hints);
assert.equal(result[0].avatarUrl,hints[0].avatarUrl);
assert.equal(result[0].avatarSource,'official-rendered-card');
assert.equal(result[1].avatarUrl,hints[1].avatarUrl);
assert.equal(result[1].profileUrl,hints[1].links[0]);
assert.equal(result[2].avatarUrl,'https://example.com/existing.png');
console.log('Platform DOM enrichment passed.');
