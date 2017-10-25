var columns = ["name", "continent", "gdp", "life_expectancy", "population", "year"];

var filter = [];
var table, thead, tbody, chart, svg, barHolder, bars, trans;

var sortByDescending = false;
var sortParameter = "name";

var aggregation = "none";
var currentYear = 1995;
var currentData = 0;
var chartEncoding = "population";


function change_format(type,text)
{
if (type == 2)
   {
		var format = d3.format(".2s")(text);
		return format;
	}
if (type == 3)
	{
		var format = d3.format(".3r")(text);
		return format;
	}
if (type == 4)
	{
		var format = d3.format(",.2r")(text);
		return format;
	}	
	return text;		
};

function load_data()
{
 d3.json("https://raw.githubusercontent.com/avt00/dvcourse/master/countries_1995_2012.json", function(error, data) {
    data.forEach(function callback(d, index, array) {
      d.gdp = d.years[currentYear - 1995].gdp;
      d.life_expectancy = d.years[currentYear - 1995].life_expectancy;
      d.population = d.years[currentYear - 1995].population;
      d.year = d.years[currentYear - 1995].year;
    });
    newData = data;

    if (aggregation == "by continent") {
      data = d3.nest().key(function(d) { return d.continent; }).entries(data);
      var nestedKeys = d3.keys(data);
      nestedKeys.forEach(function (d, index, array) {
        newData[index].name = data[index].key;
        newData[index].continent = data[index].key;
        newData[index].gdp = d3.sum(data[index].values, function callback(d, index, array) {
          return d.gdp;
        });
        newData[index].life_expectancy = d3.mean(data[index].values, function callback(d, index, array) {
          return d.life_expectancy;
        });
        newData[index].population = d3.sum(data[index].values, function callback(d, index, array) {
          return d.population;
        });
        newData[index].year = currentYear
      });
      newData = newData.filter(function (d) {
        return (d["continent"] == d["name"]);
      });
      data = newData;
    }

    if (filter.length) {
      data = data.filter(function (d) {
        return (filter.indexOf(d.continent) != -1);
      });
    }

    if(sortParameter) {
      data.sort(function(a, b) {
        var result = d3.descending(a[sortParameter], b[sortParameter]);
        if (sortByDescending != true)
        {
          result = -result;
        }
        if (result == 0)
        {
          result = -d3.descending(a["name"], b["name"]);
        }
        return result;
      });
    }
    currentData = data;
    create_table();
    create_chart();
  });
}

function create_table()
{  

if (table){
    if (tbody) tbody.remove();
    tbody = table.append("tbody");
    var rows = tbody.selectAll("tr.row")
      .data(currentData)
      .enter()
      .append("tr").attr("class", "row");

    var cells = rows.selectAll("td")
      .data(function(row) {
          return d3.range(columns.length).map(function(column, i) {
              return row[columns[i]];
          });
      })
      .enter()
      .append("td")
      .text(function(d, i) {  return change_format(i,d); })
      .on("mouseover", function(d, i) {

        d3.select(this.parentNode)
          .style("background-color", "#F3ED86");
    
      }).on("mouseout", function() {

        tbody.selectAll("tr")
          .style("background-color", null)
          .selectAll("td")
          .style("background-color", null);

      });
  } 	

    
 }
 
 function init_table()
 {
 table = d3.select("div[id=table]").append("table");
  if (table) {
    thead = table.append("thead").attr("class", "thead");
    table.append("caption")
      .html("World Countries Ranking");

    thead.append("tr").selectAll("th")
      .data(columns)
    .enter()
      .append("th").style("cursor", "s-resize")
      .text(function(d) { return d; })
      .on("click", function(header, i) {
        sortByDescending = !sortByDescending;
        sortParameter = columns[i];
        if (sortByDescending) {
          thead.selectAll("th").style("cursor", "s-resize").text(function(d) { return d; });
          this.innerHTML = columns[i] + " ↓";
        }
        else {
          thead.selectAll("th").style("cursor", "n-resize").text(function(d) { return d; });
          this.innerHTML = columns[i] + " ↑";
        }
        load_data();
      });
    load_data();
  }
 }
 
 function on_ctl_change() {
  var remove = false;
  currentYear = d3.select("input[type=range]").property("value");

  var oldFilter = filter;
  filter = [];
  d3.selectAll("input[type=checkbox]").each(function(d) {
    if (d3.select(this).property("checked")) {
      filter.push(d3.select(this).attr("value"));
    }
  });
  if (oldFilter.length == filter.length) {
    filter.forEach(function callback(d, index, array) {
      if (d != oldFilter[index]) remove = true;
    });
  } else remove = true;

  var oldAggr = aggregation;
  d3.selectAll("input[name=aggregation]").each(function(d) {
    if (d3.select(this).property("checked")) {
      aggregation = d3.select(this).attr("value");
    }
  });
  if (oldAggr != aggregation) remove = true;

  var selection = d3.selectAll("input[name=sorting]"), oldSorting = sortParameter;
  if (selection) {
    selection.each(function(d) {
      if (d3.select(this).property("checked")) {
        sortParameter = d3.select(this).attr("value");
        if (sortParameter == "name") {
          sortByDescending = false;
        } else {
          sortByDescending = true;
        }
      }
    });
    if (oldSorting != sortParameter) remove = true;
  }

  selection = d3.selectAll("input[name=chartEncoding]");
  if (selection) {
    selection.each(function(d) {
      if (d3.select(this).property("checked")) {
        chartEncoding = d3.select(this).attr("value");
      }
    });
  }

  if (remove) {
    if (barHolder) {
      barHolder.remove();
      barHolder = 0;
    }
  }
  load_data();
}


function create_chart() {
  if (chart) {
    var margin = {top: 5, right: 5, bottom: 50, left: 50};
    // we will need to create new scales since the orientation is swapped
    // y value determined by month
    var fullWidth = 600;
    var fullHeight = 1300;
    var textWidth = 180;
    // the width and height values will be used in the ranges of our scales
    var width = fullWidth - margin.right - margin.left - textWidth;
    var height = fullHeight - margin.top - margin.bottom;
    if (!svg) {
      svg = chart.append('svg')
        .attr('width', fullWidth)
        .attr('height', fullHeight);
    }

    var nameScale = d3.scaleBand()
      .domain(currentData)
      .range([0, height])
      .paddingInner(0.1);

    // the height of the bars is determined by the height of the chart
    var barWidth = 20;

    // x value determined by temp
    var barScale = d3.scaleLinear()
      .domain([0, d3.max(currentData, function(d) { return d[chartEncoding]; })])
      .range([0, width]);

    if (!barHolder)
    {
      barScale = d3.scaleLinear()
        .domain([0, d3.max(currentData, function(d) { return d[chartEncoding]; })])
        .range([0, width]);
      if (!barHolder) barHolder = svg.append('g')
        .classed('bar-holder', true);
      var yPos = 0;
      barHolder.selectAll('rect.bar')
        .data(currentData)
      .enter()
      .append('rect')
        .classed('bar', true).transition()
        .attr('x', textWidth)
        .attr('width', function(d) {
            return barScale(d[chartEncoding]);
          })
        .attr('y', function(d) {
            yPos += barWidth + 5;
            return (yPos - barWidth);
          })
        .attr('height', barWidth);
      yPos = 0;
      barHolder.selectAll('text')
        .data(currentData)
      .enter()
      .append('text').text(function(d) {
          return d.name;
        }).transition()
        .attr("text-anchor", "end")
        .attr("x", textWidth - 5)
        .attr('y', function(d) {
            yPos += barWidth + 5;
            return (yPos - barWidth*0.3);
          });
        bars = barHolder.selectAll('rect.bar');
      } else {
        barScale = d3.scaleLinear()
          .domain([0, d3.max(currentData, function(d) { return d[chartEncoding]; })])
          .range([0, width]);
        bars.transition()
        .attr('width', function(d) {
            return barScale(d[chartEncoding]);
          })
      }
    }
}

function init_chart() {
  chart = d3.select("div[id=chart]");
  load_data();
}

