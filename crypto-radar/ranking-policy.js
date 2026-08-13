// User-defined ranking policy: comprehensive first, then capital scale, current followers, and lead-trading duration.
// Risk is displayed separately and never changes the comprehensive order.
RANKS.splice(0,RANKS.length,
  {key:'hot',name:'综合',hint:'带单规模 → 当前跟单人数 → 带单天数；风险仅提示，不参与综合排序'},
  {key:'aum',name:'带单规模',hint:'AUM 从高到低'},
  {key:'followers',name:'跟单人数',hint:'当前跟单人数从高到低'},
  {key:'days',name:'带单天数',hint:'带单时间从长到短'},
  {key:'pnl',name:'收益额',hint:'所选周期收益额，从高到低'},
  {key:'roi',name:'收益率',hint:'所选周期收益率，从高到低'},
  {key:'drawdown',name:'低回撤',hint:'所选周期最大回撤越低越靠前'},
  {key:'flow',name:'资金流入',hint:'固定使用近30天估算净流入'},
  {key:'deep',name:'深度实盘',hint:'仅已有深度数据的交易员，按所选周期收益额'},
  {key:'risk',name:'风险预警',hint:'风险排查视图；不影响综合榜排序'}
);
currentRank='hot';
