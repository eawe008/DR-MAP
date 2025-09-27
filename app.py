from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/receive', methods=['POST'])
def receive_data():
    try:
        # Get JSON body
        data = request.get_json()

        # Validate it's a list of strings
        if not isinstance(data, list) or not all(isinstance(item, str) for item in data):
            return jsonify({"error": "Expected JSON array of strings"}), 400

        # Now 'data' is your Python list of strings
        print("Received:", data)

        # Example: process or store it
        collected_data = [s.upper() for s in data]

        return jsonify({
            "status": "success",
            "received_count": len(data),
            "processed": collected_data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
