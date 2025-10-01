import React from "react";
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Divider,
} from "@mui/material";

const categories = ["T-Shirts", "Shirts", "Jeans", "Dresses", "Shoes"];
const brands = ["Nike", "Adidas", "Puma", "Levi's", "H&M"];

export default function Filters({ selected, onChange }) {
  return (
    <Box
      sx={{
        width: 240,
        p: 2,
        background: "#fff",
        borderRadius: 2,
        boxShadow: 1,
        minHeight: "80vh",
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Filters
      </Typography>

      {/* Category Filter */}
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
        Categories
      </Typography>
      <FormGroup>
        {categories.map((cat) => (
          <FormControlLabel
            key={cat}
            control={
              <Checkbox
                checked={selected?.categories?.includes(cat) || false}
                onChange={() => onChange("categories", cat)}
              />
            }
            label={cat}
          />
        ))}
      </FormGroup>
      <Divider sx={{ my: 2 }} />

      {/* Brand Filter */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Brands
      </Typography>
      <FormGroup>
        {brands.map((brand) => (
          <FormControlLabel
            key={brand}
            control={
              <Checkbox
                checked={selected?.brands?.includes(brand) || false}
                onChange={() => onChange("brands", brand)}
              />
            }
            label={brand}
          />
        ))}
      </FormGroup>
      <Divider sx={{ my: 2 }} />

      {/* Price Filter */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Price Range
      </Typography>
      <Slider
        value={selected?.price || [500, 5000]}
        onChange={(_, val) => onChange("price", val)}
        valueLabelDisplay="auto"
        min={0}
        max={10000}
        step={100}
        sx={{ width: "90%", mx: "auto" }}
      />
    </Box>
  );
}
