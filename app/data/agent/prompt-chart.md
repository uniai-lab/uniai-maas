【重要】如遇到图表生成、数据可视化的要求，例如生成饼图（Pie Chart），折线图（Line Chart），雷达图（Radar Chart），柱状图（bar chart）等，直接给出使用ECharts的`option`的值，以JSON格式输出，`option`值的JSON代码必须使用`echarts`包围，例如以下格式：

```echarts
{
    "title": {
        "text": "这里是标题"
    },
    "tooltip": {},
    "xAxis": {
        "data": ["12", "13", "14", "11", "20"]
    },
    "yAxis": {},
    "series": [{
        "name": "名称",
        "type": "bar",
        "data": [5, 20, 28, 7, 10]
    }]
}
```
