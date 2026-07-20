import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from backend.seed_graph_data import seed_mock_data

if __name__ == "__main__":
    print("Resetting database for the hackathon demo...")
    seed_mock_data()
    print("Demo environment reset complete.")
