import pytest
from main import extract_random_traits


@pytest.fixture
def sample_analysis():
    return {
        "face_shape": "oval",
        "hair": {
            "color": "brown",
            "texture": "wavy",
            "thickness": "medium",
        },
        "eyes": {
            "color": "blue",
            "shape": "almond",
            "dark_circles": True,
        },
        "nose": {
            "shape": "straight",
            "size": "medium",
        },
        "ears": {
            "size": "small",
            "shape": "round",
            "attachment": "attached",
            "lobe_type": "attached",
            "symmetry": True,
            "protrusion": "small",
            "piercings": False,
        },
        "skin_features": {
            "complexion": "fair",
            "texture": "smooth",
            "visible_pores": True,
            "blemishes": False,
            "wrinkles_level": "none",
        },
        "perceived_age_indicators": {
            "estimated_age": 25,
            "aging_signs": []
        },
        "facial_symmetry": {
            "overall_rating": 8,
            "notable_asymmetries": []
        },
        "lips": {
            "shape": "heart",
            "fullness": "full",
            "lip_lines": False,
            "cupids_bow": "none"
        },
        "distinctive_features": {
            "moles": False,
            "freckles": False,
            "scars": False,
            "dimples": False,
            "facial_hair": "none"
        },
        "facial_structure": {
            "cheekbone_prominence": "prominent",
            "jaw_definition": "defined",
            "chin_shape": "square",
            "forehead_height": "high"
        },
    }


def test_extract_random_traits_returns_correct_number_of_traits(sample_analysis):
    traits = extract_random_traits(sample_analysis, num_traits=6)
    print(f"\nChosen traits: {traits}")
    assert len(traits.split(". ")) == 6
