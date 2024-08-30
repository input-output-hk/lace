import * as React from 'react';
import { mapCategory } from './mapper';
import './styles.scss';

export interface ICategoryChip {
  label: string;
}

const CategoryChip: React.FC<ICategoryChip> = ({ label }) => (
  <span className="category-chip">
    {mapCategory(label)}
    <span className="category-text">{label}</span>
  </span>
);

export default CategoryChip;
