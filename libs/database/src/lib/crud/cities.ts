import { Filter, ObjectId } from 'mongodb';
import { City } from '@mtes/types';
import db from '../database';

export const getCities = (filter: Filter<City>) => {
  return db.collection<City>('cities').find(filter).toArray();
};

export const getCity = (filter: Filter<City>) => {
  return db.collection<City>('cities').findOne(filter);
};

export const addCity = (city: City) => {
  return db.collection<City>('cities').insertOne(city);
};

export const addCities = (cities: City[]) => {
  return db.collection<City>('cities').insertMany(cities);
};

export const updateCity = (filter: Filter<City>, newCity: Partial<City>, upsert = false) => {
  return db.collection<City>('cities').updateOne(filter, { $set: newCity }, { upsert });
};

export const deleteCity = (filter: Filter<City>) => {
  return db.collection<City>('cities').deleteOne(filter);
};

export const deleteCities = (filter: Filter<City>) => {
  return db.collection<City>('cities').deleteMany(filter);
};
