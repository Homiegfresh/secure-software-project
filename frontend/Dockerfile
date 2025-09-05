# Simple Nginx image to serve static files
FROM nginx:1.27-alpine

# Remove default nginx static content and copy our app
RUN rm -rf /usr/share/nginx/html/*
COPY . /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
