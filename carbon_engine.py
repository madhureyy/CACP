#!/usr/bin/env python3
"""
Carbon-Calculation Engine for Cinematic Asset Storage (CACP)
=============================================================
Implements scientifically grounded carbon and cost calculations for cloud storage
of creative assets, specifically calibrated for 4K/8K video workflows and the
UVG 4K Video Dataset (Beauty, Bosphorus, CityAlley, FlowerFocus, etc.).

Standards & References:
- GHG Protocol Scope 2 (Operational Grid Emissions) & Scope 3 (Embodied Hardware).
- Cloud Carbon Footprint (CCF) methodology (Etsy/Thoughtworks).
- IEA / Electricity Maps / EPA eGRID Regional Carbon Intensities.
- ITU-T L.1410 / The Shift Project media storage assessments.
"""

import sys
import os
import json
import argparse
from typing import Dict, Any, Optional

# === REGIONAL GRID CARBON INTENSITIES (gCO2e per kWh) ===
# 2024-2026 calibrated estimates from IEA & national energy authorities
GRID_CARBON_INTENSITY = {
    'US': 390.0,      # US national average grid mix
    'EU': 275.0,      # EU-27 weighted grid average (high renewables/nuclear)
    'Asia': 510.0,    # Asia-Pacific regional average (coal-heavy mix)
    'India': 710.0,   # Central Electricity Authority of India (CEA) baseline
}

# === STORAGE PRICING (USD per GB per month) ===
STORAGE_PRICING = {
    'gcs': {
        'Standard': 0.020,
        'Nearline': 0.010,
        'Coldline': 0.004,
        'Archive': 0.0012,
    },
    'azure': {
        'Hot': 0.018,
        'Cool': 0.010,
        'Cold': 0.0036,
        'Archive': 0.00099,
    }
}

# === DATA CENTER POWER USAGE EFFECTIVENESS (PUE) ===
# Hyperscale data center averages reported in Google & Microsoft sustainability reports
PROVIDER_PUE = {
    'gcs': 1.10,    # Google Cloud average trailing twelve-month PUE
    'azure': 1.12,  # Microsoft Azure average PUE
}

# === ENERGY CONSUMPTION COEFFICIENTS ===
# Baseline energy to maintain 1 GB on high-availability cloud storage for 1 month (kWh/GB-month)
# Includes active drives, server chassis idle, cooling overhead
ENERGY_STORAGE_KWH_PER_GB_MONTH = 0.0010

# Embodied manufacturing & disposal emissions per GB of enterprise NVMe/HDD storage drive allocated per year (kg CO2e / GB / year)
EMBODIED_CARBON_KG_PER_GB_YEAR = 0.0144

# Network egress transmission energy: ~0.02 kWh per GB transferred across WAN/CDN
NETWORK_TRANSFER_KWH_PER_GB = 0.0200


def calculate_storage_emissions(
    size_gb: float,
    months: float = 12.0,
    region: str = 'US',
    provider: str = 'gcs',
    storage_tier: str = 'Standard',
    include_embodied: bool = True,
    monthly_egress_gb: float = 0.0
) -> Dict[str, Any]:
    """
    Calculate total carbon footprint and monetary cost for storing a given volume of data.
    """
    region = region if region in GRID_CARBON_INTENSITY else 'US'
    provider = provider.lower() if provider.lower() in PROVIDER_PUE else 'gcs'
    grid_intensity = GRID_CARBON_INTENSITY[region]
    pue = PROVIDER_PUE[provider]

    # 1. Operational Energy (kWh)
    # Energy = Data (GB) * kWh/GB-month * Months * PUE
    operational_energy_kwh = size_gb * ENERGY_STORAGE_KWH_PER_GB_MONTH * months * pue

    # 2. Operational Carbon Emissions (kg CO2e)
    # Emissions = Energy (kWh) * Grid Intensity (gCO2e/kWh) / 1000
    operational_carbon_kg = (operational_energy_kwh * grid_intensity) / 1000.0

    # 3. Embodied Carbon (Scope 3 - Manufacturing of Drives & Servers)
    embodied_carbon_kg = 0.0
    if include_embodied:
        embodied_carbon_kg = size_gb * (EMBODIED_CARBON_KG_PER_GB_YEAR / 12.0) * months

    # 4. Network Egress Energy & Carbon (if data is accessed/downloaded)
    egress_energy_kwh = monthly_egress_gb * months * NETWORK_TRANSFER_KWH_PER_GB * pue
    egress_carbon_kg = (egress_energy_kwh * grid_intensity) / 1000.0

    # Total Carbon
    total_carbon_kg = operational_carbon_kg + embodied_carbon_kg + egress_carbon_kg

    # 5. Financial Cost ($ USD)
    provider_pricing = STORAGE_PRICING.get(provider, STORAGE_PRICING['gcs'])
    unit_price = provider_pricing.get(storage_tier, list(provider_pricing.values())[0])
    monthly_cost = size_gb * unit_price
    total_cost = monthly_cost * months

    # Real-world equivalent benchmarks for human comprehension
    tree_seedlings_year = total_carbon_kg / 20.0  # ~20 kg CO2 absorbed per urban tree per year
    km_driven_car = total_carbon_kg / 0.192       # ~192 g CO2 per km for average gasoline passenger vehicle
    smartphones_charged = (operational_energy_kwh + egress_energy_kwh) / 0.012 # ~12 Wh per smartphone charge

    return {
        'size_gb': round(size_gb, 3),
        'months': round(months, 1),
        'region': region,
        'provider': provider.upper(),
        'storage_tier': storage_tier,
        'pue': pue,
        'grid_intensity_g_per_kwh': grid_intensity,
        'operational_energy_kwh': round(operational_energy_kwh, 4),
        'operational_carbon_kg': round(operational_carbon_kg, 4),
        'embodied_carbon_kg': round(embodied_carbon_kg, 4),
        'egress_carbon_kg': round(egress_carbon_kg, 4),
        'total_carbon_kg': round(total_carbon_kg, 4),
        'annual_carbon_kg': round((total_carbon_kg / months) * 12.0, 4) if months > 0 else 0.0,
        'monthly_cost_usd': round(monthly_cost, 2),
        'total_cost_usd': round(total_cost, 2),
        'equivalents': {
            'tree_seedlings_to_offset_annual': round(tree_seedlings_year, 2),
            'km_driven_passenger_car': round(km_driven_car, 1),
            'smartphones_charged': round(smartphones_charged, 0)
        }
    }


def calculate_uvg_sequence_impact(
    sequence_name: str,
    raw_size_gib: float,
    duration_seconds: float,
    fps: float,
    bit_depth: str = '8-bit',
    region: str = 'US',
    months: float = 12.0
) -> Dict[str, Any]:
    """
    Computes comparative storage and carbon analysis for an official UVG sequence:
    Raw Uncompressed YUV vs ProRes 422 HQ vs HEVC/H.265 vs AV1 video codecs.
    """
    raw_size_gb = raw_size_gib * 1.07374  # Convert GiB to decimal GB

    # Industry standard compression ratios for 4K video:
    # ProRes 422 HQ: ~10:1 vs raw uncompressed
    # H.264 High Profile (CRF 18): ~50:1
    # HEVC/H.265 Main 10 (CRF 20): ~90:1
    # AV1 (CRF 22): ~120:1
    codec_factors = {
        'Raw YUV (Uncompressed)': {'ratio': 1.0, 'encode_kwh_per_min': 0.0},
        'Apple ProRes 422 HQ': {'ratio': 0.10, 'encode_kwh_per_min': 0.002},
        'H.264 / AVC (High 4:2:0)': {'ratio': 0.025, 'encode_kwh_per_min': 0.004},
        'H.265 / HEVC (Main 10)': {'ratio': 0.012, 'encode_kwh_per_min': 0.008},
        'AV1 (Next-Gen Open Codec)': {'ratio': 0.008, 'encode_kwh_per_min': 0.012},
    }

    results = []
    baseline_annual_carbon = 0.0
    baseline_annual_cost = 0.0

    duration_min = duration_seconds / 60.0

    for codec, data in codec_factors.items():
        compressed_size_gb = raw_size_gb * data['ratio']
        emissions = calculate_storage_emissions(compressed_size_gb, months=months, region=region)
        
        # One-off encoding energy & carbon
        encode_energy_kwh = duration_min * data['encode_kwh_per_min']
        encode_carbon_kg = (encode_energy_kwh * GRID_CARBON_INTENSITY[region]) / 1000.0
        
        total_carbon_with_encoding = emissions['annual_carbon_kg'] + encode_carbon_kg

        if codec == 'Raw YUV (Uncompressed)':
            baseline_annual_carbon = total_carbon_with_encoding
            baseline_annual_cost = emissions['total_cost_usd']

        carbon_savings_pct = (
            ((baseline_annual_carbon - total_carbon_with_encoding) / baseline_annual_carbon * 100.0)
            if baseline_annual_carbon > 0 else 0.0
        )
        cost_savings_pct = (
            ((baseline_annual_cost - emissions['total_cost_usd']) / baseline_annual_cost * 100.0)
            if baseline_annual_cost > 0 else 0.0
        )

        results.append({
            'codec': codec,
            'size_gb': round(compressed_size_gb, 3),
            'encode_carbon_kg': round(encode_carbon_kg, 5),
            'storage_annual_carbon_kg': emissions['annual_carbon_kg'],
            'net_annual_carbon_kg': round(total_carbon_with_encoding, 4),
            'annual_cost_usd': emissions['total_cost_usd'],
            'carbon_reduction_percent': round(carbon_savings_pct, 1),
            'cost_reduction_percent': round(cost_savings_pct, 1)
        })

    return {
        'sequence_name': sequence_name,
        'raw_size_gib': raw_size_gib,
        'raw_size_gb': round(raw_size_gb, 3),
        'duration_seconds': duration_seconds,
        'fps': fps,
        'bit_depth': bit_depth,
        'region': region,
        'retention_months': months,
        'codecs_comparison': results
    }


def compare_all_regions(size_gb: float, months: float = 12.0) -> Dict[str, Any]:
    """
    Compare carbon footprint across all 4 supported regions for a given data volume.
    Demonstrates the significant carbon arbitrage potential by choosing greener data center regions.
    """
    comparisons = {}
    for region in ['EU', 'US', 'Asia', 'India']:
        comparisons[region] = calculate_storage_emissions(size_gb=size_gb, months=months, region=region)
    
    # Calculate carbon delta relative to EU (cleanest grid baseline)
    eu_carbon = comparisons['EU']['total_carbon_kg']
    for region, data in comparisons.items():
        factor = data['total_carbon_kg'] / eu_carbon if eu_carbon > 0 else 1.0
        data['carbon_factor_vs_eu'] = round(factor, 2)
        
    return comparisons


def main():
    parser = argparse.ArgumentParser(description="Cinematic Asset Carbon Calculation Engine")
    parser.add_argument('--action', choices=['calculate', 'uvg', 'regions'], default='calculate')
    parser.add_argument('--size_gb', type=float, default=100.0, help="Asset size in gigabytes")
    parser.add_argument('--months', type=float, default=12.0, help="Storage duration in months")
    parser.add_argument('--region', choices=['US', 'EU', 'Asia', 'India'], default='US')
    parser.add_argument('--provider', choices=['gcs', 'azure'], default='gcs')
    parser.add_argument('--tier', default='Standard', help="Storage tier (Standard, Archive, etc.)")
    parser.add_argument('--sequence', default='Beauty', help="UVG sequence name")
    parser.add_argument('--raw_gib', type=float, default=3.87, help="Raw GiB for sequence")
    parser.add_argument('--duration', type=float, default=5.0, help="Duration in seconds")
    parser.add_argument('--fps', type=float, default=120.0, help="Frame rate")
    parser.add_argument('--json', action='store_true', help="Output pure JSON")

    args = parser.parse_args()

    if args.action == 'calculate':
        result = calculate_storage_emissions(
            size_gb=args.size_gb,
            months=args.months,
            region=args.region,
            provider=args.provider,
            storage_tier=args.tier
        )
    elif args.action == 'uvg':
        result = calculate_uvg_sequence_impact(
            sequence_name=args.sequence,
            raw_size_gib=args.raw_gib,
            duration_seconds=args.duration,
            fps=args.fps,
            region=args.region,
            months=args.months
        )
    elif args.action == 'regions':
        result = compare_all_regions(
            size_gb=args.size_gb,
            months=args.months
        )
    else:
        result = {"error": "Invalid action"}

    if args.json or True:
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
