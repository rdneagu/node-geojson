const fs = require('fs');
const reproject = require('reproject');
const proj4 = require('proj4');
const xml = require('xml2js');
const _ = require('lodash');
const xmlParser = new xml.Parser();

var geojson2svg = require('geojson2svg');
const countriesGeoJson = './gis/countries.geojson';
const citiesGeoJson = './gis/cities.geojson';
const capitalsJson = './capitals/capitals.json';

function fromJson(file) {
  const rawdata = fs.readFileSync(file);
  return JSON.parse(rawdata);
}

function sanitize(string) {
  return string.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

// ne_110m_admin_0_map_units
function parseCountries() {
  const geojson = fromJson(countriesGeoJson);
  const capitals = fromJson(capitalsJson);
  const features = geojson.features
    .filter((c) => c.properties.GU_A3 !== 'ATA')
    // .forEach((c) => {
    //   console.log(`{ "gu_a3": "${c.properties.GU_A3}", "sub": "${c.properties.SUBUNIT}", "iso": "${c.properties.ISO_A2}" },`);
    // })
    .map((c) => {
      return {
        type: c.type,
        geometry: c.geometry,
        properties: {
          id: c.properties.GU_A3,
          name: c.properties.SUBUNIT,
          capital: {
            name: capitals[c.properties.GU_A3].capital,
            geo: capitals[c.properties.GU_A3].coords.split(','),
          },
        },
        id: c.properties.GU_A3,
      };
  });
  const rs = {
    type: "FeatureCollection",
    features: features,
  }
  fs.writeFileSync('./geodata/worldMapCountries.json', JSON.stringify(rs));
  console.log('Countries done!');

  parseCities(rs);
}

// ne_10m_admin_1_states_provinces
function parseCities(countryList) {
  const geojson = fromJson(citiesGeoJson);
  _.forEach(countryList.features, (country) => {
    _.forEach(geojson.features, (c) => {
      if (c.properties.geonunit === country.properties.name && c.properties.gu_a3 !== country.properties.id) {
        console.log(`name: ${country.properties.name} | gu_a3: ${c.properties.gu_a3} | adm0_a3: ${c.properties.adm0_a3} | cid: ${country.properties.id}`);
      }
    });
    const match = (c) => (c.properties.gu_a3 === country.properties.id || c.properties.adm0_a3 === country.properties.id);
    const cities = geojson.features.filter(match);
    if (cities.length) {
      console.log(`name: ${country.properties.name} | cid: ${country.properties.id}`);
      const features = cities.map((c) => ({
        type: c.type,
        geometry: c.geometry,
        properties: {
          id: c.properties.adm1_code,
          name: c.properties.name,
          country: country.properties.id,
          countryName: c.properties.geonunit,
          type: c.properties.type_en,
        },
        id: c.properties.adm1_code,
      }));
      const rs = {
        type: "FeatureCollection",
        features: features,
      };
      fs.writeFileSync(`./geodata/countries/${country.properties.id}.json`, JSON.stringify(rs));
    }
  });
  console.log('Cities done!');
}

(function() {
  parseCountries();
})();