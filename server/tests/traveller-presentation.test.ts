import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countryFlag,normalizeTraveller,travellerTitles,updateTraveller} from '../../shared/travellerPresentation';
import type {Traveller} from '../../shared/types';
const person:Traveller={title:'Mr',firstName:'anita',lastName:'sharma',type:'ADULT'};
test('only Mr Mrs Ms are offered; legacy titles remain usable through normalization',()=>{assert.deepEqual(travellerTitles,['Mr','Mrs','Ms']);assert.equal(normalizeTraveller({...person,title:'Miss'}).title,'Ms');assert.equal(normalizeTraveller({...person,title:'Master',type:'CHILD'}).title,'Mr');});
test('names and passport normalize at input without affecting unrelated credentials',()=>{const result=updateTraveller(person,{firstName:'aNiTa',lastName:'sHaRmA',passport:'ab123456',nationality:'us'});assert.equal(result.firstName,'ANITA');assert.equal(result.lastName,'SHARMA');assert.equal(result.passport,'AB123456');assert.equal(result.nationality,'US');assert.equal(person.firstName,'anita');});
test('title and gender remain consistent for adult child and infant selections',()=>{assert.equal(updateTraveller(person,{title:'Mrs'}).gender,'FEMALE');assert.equal(updateTraveller({...person,type:'CHILD'},{gender:'MALE'}).title,'Mr');assert.equal(updateTraveller({...person,type:'INFANT'},{gender:'FEMALE'}).title,'Ms');});
test('flag fallback uses ISO country codes and rejects invalid identifiers',()=>{assert.equal(countryFlag('US'),'🇺🇸');assert.equal(countryFlag('IN'),'🇮🇳');assert.equal(countryFlag('+91'),'');});
