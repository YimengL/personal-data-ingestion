FROM python:3.12-slim

WORKDIR /app
COPY garmin/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY garmin/garmin_client.py ./garmin_client.py

CMD ["python", "garmin_client.py"]